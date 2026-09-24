import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { buildDecks, seedStudents } from "../src/lib/decks";

/**
 * Seed Fase 1.3 — memindahkan seluruh bank data lokal (TS) ke Postgres.
 *
 * Idempoten: setiap deck memakai id tetap, jadi menjalankan ulang script ini
 * hanya me-refresh isinya (tidak menumpuk baris baru). Data hasil siswa
 * (`Result`) tidak pernah disentuh.
 *
 * Jalankan: `npx prisma db seed`  (atau `npm run db:seed`)
 */

const CLASS_ID = "class-7a";
const TEACHER_ID = "teacher-utama";

async function main() {
  const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!url) {
    console.error(
      "\n✖ DATABASE_URL / DIRECT_URL belum diisi.\n" +
        "  Salin .env.example → .env lalu isi connection string Supabase.\n",
    );
    process.exitCode = 1;
    return;
  }

  const isLocal = url.includes("localhost") || url.includes("127.0.0.1");
  const adapter = new PrismaPg({
    connectionString: url,
    ssl: isLocal ? undefined : { rejectUnauthorized: false },
  });
  const prisma = new PrismaClient({ adapter });

  try {
    /* ------------------------------ Kelas ------------------------------ */
    await prisma.class.upsert({
      where: { id: CLASS_ID },
      create: {
        id: CLASS_ID,
        name: "Kelas 7A",
        grade: "7",
        homeroom: "Guru Bahasa Inggris",
      },
      update: { name: "Kelas 7A" },
    });

    /* ------------------------------ Guru ------------------------------- */
    await prisma.teacher.upsert({
      where: { id: TEACHER_ID },
      create: {
        id: TEACHER_ID,
        name: "Guru Utama",
        pin: process.env.TEACHER_PIN || "1234",
      },
      update: {},
    });

    /* ----------------------------- Siswa ------------------------------- */
    const students = seedStudents();
    for (const s of students) {
      await prisma.student.upsert({
        where: { nisn: s.nisn },
        create: {
          nisn: s.nisn,
          name: s.nama,
          legacyScore: s.total_nilai,
          classId: CLASS_ID,
        },
        update: { name: s.nama, legacyScore: s.total_nilai, classId: CLASS_ID },
      });
    }
    console.log(`  ✓ ${students.length} siswa`);

    /* ----------------------------- Deck & Item ------------------------- */
    const decks = buildDecks();
    let itemCount = 0;

    for (const deck of decks) {
      await prisma.deck.upsert({
        where: { id: deck.id },
        create: {
          id: deck.id,
          title: deck.title,
          skill: deck.skill,
          level: deck.level,
          tags: deck.tags,
          isPublic: true,
        },
        update: {
          title: deck.title,
          skill: deck.skill,
          level: deck.level,
          tags: deck.tags,
          isPublic: true,
        },
      });

      // Ganti isi item deck secara bersih agar seed bisa dijalankan berulang.
      await prisma.item.deleteMany({ where: { deckId: deck.id } });
      await prisma.item.createMany({
        data: deck.items.map((item) => ({
          deckId: deck.id,
          type: item.type,
          prompt: item.prompt,
          answer: item.answer,
          options: item.options ?? [],
          media: item.media,
          hint: item.hint,
          difficulty: item.difficulty,
        })),
      });
      itemCount += deck.items.length;
      console.log(`  ✓ ${deck.title} — ${deck.items.length} item`);
    }

    console.log(
      `\n✅ Seed selesai: ${students.length} siswa · ${decks.length} deck · ${itemCount} item.\n`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("\n✖ Seed gagal:", error);
  process.exitCode = 1;
});
