# 🎓 BIG PLAN — Pusat Games Belajar Bahasa Inggris

> Dokumen ini adalah **peta jalan induk**. Setiap fase punya daftar tugas, kriteria selesai
> (Definition of Done), dan estimasi. Centang kotak saat selesai.
>
> Status terakhir diperbarui: **September 2026**

---

## 1. Visi & Tujuan

**Visi:** Menjadi *satu tempat* (hub) tempat guru dan siswa bisa belajar bahasa Inggris
lewat permainan — dari pemanasan 5 menit sampai turnamen antar kelas — di papan interaktif
maupun perangkat siswa masing-masing.

**Tujuan terukur (12 bulan):**

| # | Tujuan | Indikator |
|---|--------|-----------|
| G1 | 12+ game bahasa Inggris yang benar-benar berbeda | ≥12 game live, tiap game punya identitas visual sendiri |
| G2 | Data terpusat (bukan per-device) | Skor & data kelas tersinkron antar perangkat |
| G3 | Guru bisa membuat soal sendiri < 5 menit | Form builder + import Excel/CSV jalan |
| G4 | Siswa bisa latihan mandiri & lihat progres | Ada akun/kode siswa + halaman progres |
| G5 | Cakupan 4 skill inti | Vocabulary, Grammar, Reading, Listening terwakili |
| G6 | Siap dipakai kelas walau internet tidak stabil | Offline-first (localStorage) + PWA |

**Non-tujuan (untuk sekarang):** bukan LMS penuh, bukan pengganti rapor resmi, bukan
platform multi-sekolah berbayar (bisa jadi arah Fase 6).

---

## 2. Kondisi Saat Ini (Audit)

### ✅ Sudah ada
- **Next.js 16** App Router + TypeScript + Tailwind v4, 13 rute aktif (semua HTTP 200).
- **9 game**: Word Battle, Spelling Battle, Sentence Battle, Continuous Battle,
  Vocabulary Match, Hangman, Anagram, Memory Match, Tebak Gambar.
- **Dua mode**: Duel 2 Tim & Latihan Mandiri (solo) — di semua game.
- **Efek "juice"**: confetti, burst, flash, combo, countdown, winner banner.
- **Musik latar per game** (Web Audio prosedural) + **efek suara** + toggle audio.
- **Getar layar** saat salah + **bonus skor kecepatan** (⚡).
- **Panel Guru** (`/settings`, PIN `1234`): edit siswa, kalimat, soal, kosakata, bank kata; export/import JSON.
- **Leaderboard** (`/leaderboard`) + simpan skor + ingat nama pemain terakhir.
- **Cek Ranking** (`/rank`) via NISN.
- Store terpusat `store.ts` (localStorage) — edit sekali di Panel Guru, semua game ikut update.
- Bank kosakata **301 kata / 12 kategori** (dipakai 4 game sekaligus).

### ⚠️ Keterbatasan saat ini (yang harus dibereskan)
| # | Masalah | Dampak |
|---|---------|--------|
| L1 | Semua data di **localStorage** (per-browser, per-device) | Skor siswa di papan ≠ skor di laptop; data hilang kalau cache dibersihkan |
| L2 | **Tidak ada identitas siswa** saat bermain | Skor tidak otomatis terhubung ke NISN |
| L3 | Data siswa masih **placeholder** (25 siswa palsu) | Ranking belum nyata |
| L4 | **Tidak ada cakupan Listening & Reading** | Belum 4 skill |
| L5 | Tidak ada **analitik kelas** (siapa lemah di apa) | Guru tidak tahu tindak lanjut |
| L6 | Tidak ada **tugas/PR** & tenggat | Tidak bisa dipakai untuk penilaian |
| L7 | Skor belum ada **bobot/level** (semua setara) | Sulit mengukur kemajuan |
| L8 | Belum ada **kontrol keyboard host** (buzzer) | Duel kurang praktis di papan |
| L9 | Belum ada **tes otomatis / CI** | Regresi mudah lolos |
| L10 | Belum ada **dokumentasi konten** (peta soal per skill) | Sulit menambah konten terstruktur |

---

## 3. Matriks Cakupan Skill Bahasa Inggris

Target akhir — semua kotak terisi minimal 1 game:

| Skill | Sub-skill | Game sekarang | Rencana |
|-------|-----------|---------------|---------|
| **Vocabulary** | Kata benda/kerja/sifat | Word Battle, Vocab Match, Memory, Tebak Gambar | + Bingo, Word Search, 4 Pics 1 Word |
| **Spelling** | Ejaan | Spelling Battle, Hangman, Anagram | + Typing Race |
| **Grammar** | Tenses | Continuous Battle | + Verb Conjugation, Preposition, Grammar Auction |
| **Grammar** | Part of speech | Word Battle | ✔ cukup |
| **Sentence** | Susun kalimat | Sentence Battle | + Jumbled Paragraph |
| **Reading** | Pemahaman bacaan | — ❌ | **Reading Race** (baru) |
| **Listening** | Dengar → pilih/tulis | — ❌ | **Listening Battle** (baru, pakai TTS) |
| **Speaking** | Ucapkan | — ❌ | **Pronounce It** (baru, Speech Recognition) |
| **Writing** | Tulis bebas | — ❌ | **Picture Story** (baru, guru nilai manual) |

---

## 4. Arsitektur Target (Evolusi A → B → C)

Prinsip: **jangan lompat**. Tiap tahap harus tetap jalan sebelum naik ke tahap berikutnya.

### Fase A — Sekarang (Offline, 1 perangkat) ✅
```
Browser ── localStorage
```
Cocok untuk: papan interaktif kelas, tanpa jaringan.

### Fase B — Server Kelas / LAN (alternatif, ❌ tidak dipilih)
```
Laptop Guru (host) ─── Next.js + API Routes + SQLite
```
Cocok bila internet sekolah sangat tidak stabil. **Dilewati** karena D1 memilih Cloud,
tetapi tetap dicatat sebagai rencana cadangan bila kelak perlu.

### Fase C — Cloud (✅ DIPILIH sebagai target)
```
Vercel ── Next.js API Routes ── Postgres (Neon/Supabase) ── Prisma ── Auth
                │
                └── SSE / polling untuk leaderboard live
```
- Akses dari rumah, multi-kelas, multi-guru.
- **Game tetap offline-first**: localStorage jadi cache; sinkron ke cloud saat online.

> **Keputusan (D1): arah data = Cloud.** Fase B (LAN) dilewati.
> Urutan kerja: bangun Reading/Listening dengan data lokal → migrasi ke Postgres (Fase 1).

---

## 5. Model Data Target

```ts
// Identitas & kelas
Class      { id, name, grade, homeroom, createdAt }
Student    { id, nisn, name, classId, avatar?, totalXp, level }
Teacher    { id, name, pin }

// Konten (semua bisa diedit guru)
Deck       { id, title, skill, level, tags[], ownerId, isPublic }
Item       { id, deckId, type, prompt, answer, options[], media?, hint?, difficulty }
// type: "vocab" | "spelling" | "grammar" | "sentence" | "reading" | "listening"

// Permainan & hasil
Session    { id, gameSlug, mode, classId?, startedAt, endedAt, hostId }
Result     { id, sessionId, studentId?, playerName, score, accuracy, maxCombo, speedAvg, createdAt }
Answer     { id, resultId, itemId, correct, ms, answerGiven }   // untuk analitik
Assignment { id, deckId, classId, dueAt, targetScore, createdBy }

// Gamifikasi
Achievement{ id, studentId, code, earnedAt }
```

**Kunci analitik:** simpan **setiap jawaban** (`Answer`) → bisa jawab pertanyaan
"siswa X lemah di skill Y" dan "soal Z paling sering salah".

---

## 6. Roadmap Berfase

> **Urutan eksekusi (sesuai keputusan):**
> **Fase 0 → Fase 3 (Reading/Listening) → Fase 1 (Cloud) → Fase 2 → Fase 4 → Fase 5 → Fase 6.**
> Alasan: Reading/Listening dibangun dulu dengan data lokal (cepat, terlihat hasilnya),
> lalu dipindahkan ke backend cloud bersama seluruh game lain.
>
> Estimasi dalam "sesi kerja" (1 sesi ≈ 1–2 jam kerja terfokus).

### FASE 0 — Fondasi Kualitas (1–2 sesi) 🔴 WAJIB DULU
Tanpa ini, fitur baru akan rapuh.

- [x] **0.1** Tambah **CI**: `npm run lint && npx tsc --noEmit && npm run build` via GitHub Actions
- [x] **0.2** Tambah **tes unit ringan** (Vitest) untuk logika murni: `scoring.ts`, `vocabulary.ts`, `sentences.ts`
- [ ] **0.3** **Isi data siswa nyata** dari `data_input.xlsx` (NISN, Nama, Nilai) → Panel Guru import
      ⚠️ **TEMUAN:** `data_input.xlsx` ternyata **daftar kata hewan**, BUKAN data siswa.
      Tidak ada data siswa asli di folder proyek. **Butuh file dari guru** (NISN, Nama, Nilai).
      Sementara `students.ts` tetap placeholder. Mekanisme import (Panel Guru) sudah ada.
- [x] **0.4** Buat **`CONTENT.md`**: peta soal per skill & level (biar konten tidak tumpang tindih)
- [ ] **0.5** Bersihkan file lama di root (`data.py`, `settings.json`, dll) → pindah ke `archive/` (JANGAN hapus token)
      ⚠️ **DITUNDA (berisiko):** memindahkan file di luar `platform/` bisa mengganggu alur kerja lama.
      **PENTING:** `settings.json` memuat **API key OpenAI asli** — jangan pernah di-commit,
      segera pindahkan/amankan manual.
- [x] **0.6** Tambah **Error Boundary** + halaman 404 kustom yang rapi
      (`app/error.tsx`, `app/global-error.tsx`, `app/not-found.tsx`)

**DoD:** CI hijau, tes jalan, data siswa nyata, tidak ada file nyasar.
→ **Status:** CI hijau ✅, 33 tes jalan ✅, 404/error rapi ✅. Data siswa & bersih-bersih file
   masih menunggu input guru.

---

### FASE 1 — Backend Cloud (Vercel + Postgres) (5–7 sesi) 🔴 INTI
Ini yang mengubah "kumpulan game" jadi "pusat". **Dikerjakan setelah Reading/Listening.**

- [x] **1.1** Siapkan Postgres (Neon/Supabase) + `DATABASE_URL` di env Vercel
      → **Provider dipilih: Supabase.** Kode & konfigurasi siap; connection string asli
      menunggu dibuat oleh guru (lihat `.env.example`).
- [x] **1.2** Pasang **Prisma**, skema: `Student`, `Class`, `Deck`, `Item`, `Session`, `Result`, `Answer`
      (`prisma/schema.prisma`, Prisma 7 + driver adapter `@prisma/adapter-pg`; `prisma generate` ✅)
- [x] **1.3** Migrasi awal + seed dari data sekarang (localStorage default → DB)
      (`prisma/seed.ts` + `src/lib/decks.ts`; idempoten. Jalankan `npm run db:seed` setelah `.env` diisi)
- [x] **1.4** API Routes: `GET/POST /api/students`, `/api/decks`, `/api/results`, `/api/classes`
      (+ `/api/auth`, `/api/health`, `/api/export`)
- [x] **1.5** Ganti `store.ts` → fetch API + **cache localStorage** (offline-first: pakai cache dulu, sync di belakang)
      (`syncStudents`, `pushStudents`, `pullStudents`; localStorage tetap sumber kebenaran)
- [x] **1.6** Ganti `scores.ts` → POST `/api/results` + **antrian sinkron** (retry saat online)
      (`src/lib/sync.ts`: antrian offline + listener `online` + retry 15 detik; idempoten via `clientId`)
- [x] **1.7** Leaderboard live: **polling** `/api/results` tiap 5 detik (merge lokal+cloud, dedup per id)
- [x] **1.8** Auth guru sederhana (PIN → sesi) untuk Panel Guru
      (`/api/auth` + cookie HMAC `node:crypto`; tombol buka/kunci di `/settings`)
- [x] **1.9** Backup: export JSON dari `/admin` (`/api/export`, khusus guru) — tombol
      **Unduh Cadangan Lokal** + **Unduh Cadangan Cloud** (dengan login PIN inline di halaman)
- [x] **1.10** Halaman `/admin`: status sinkron, tombol "unggah data lokal", QR/link untuk siswa

**DoD:** Skor dari HP siswa muncul di leaderboard papan dalam <2 detik saat online.
Saat offline, game tetap jalan dan data tersinkron otomatis begitu kembali online.
→ **Status:** ✅ **Kode Fase 1 TUNTAS** (lint 0, tsc 0, 63 tes, build ✓, 16 rute 200,
   API graceful 503 tanpa DB). **Yang tersisa: isi `DATABASE_URL` Supabase asli** untuk
   menjalankan `db push` + `db seed` dan menguji sinkronisasi live.

**Teknis penting:**
- Bungkus akses data dalam satu lapisan `lib/data/` (adapter) agar UI tidak tahu sumbernya.
- **Migration path**: kalau localStorage sudah ada data, tawarkan "unggah data lokal ke cloud" sekali.
- **Jangan commit kredensial** — semua lewat env var.

---

### FASE 2 — Identitas Siswa & Progres (3–4 sesi)
- [ ] **2.1** **Kode siswa** sederhana (NISN atau kode 4 digit) — tanpa password rumit
- [ ] **2.2** Layar "Masuk sebagai siapa?" sebelum main (opsional, bisa "Main cepat")
- [ ] **2.3** Simpan `studentId` di setiap `Result`
- [ ] **2.4** Halaman **`/siswa/[nisn]`**: progres per skill, XP, level, riwayat, grafik sederhana
- [ ] **2.5** **XP & Level**: rumus XP = f(skor, akurasi, kecepatan, streak). Level naik tiap N XP.
- [ ] **2.6** **Achievement**: "10 jawaban benar beruntun", "Hangman tanpa salah", "Hafal 50 kata"
- [ ] **2.7** `/rank` di-upgrade: dari sekadar nilai → ranking XP + badge

**DoD:** Siswa buka halaman sendiri, lihat XP, level, dan skill mana yang lemah.

---

### FASE 3 — Cakupan 4 Skill: Reading & Listening (4–5 sesi) 🔴 DIMAJUKAN
Dikerjakan **tepat setelah Fase 0** (sebelum backend cloud), memakai data lokal dulu.

- [x] **3.1** Tambah tipe item `reading` (teks pendek + pertanyaan) → `src/lib/reading.ts`
- [x] **3.2** Game **Reading Race**: baca paragraf, jawab cepat — 2 tim berebut
      (`/reading-race`, tema perpustakaan `tex-read`, aksen teal, musik "perpustakaan")
- [x] **3.3** Tambah tipe item `listening` + integrasi **Web Speech API (TTS)** untuk memutar audio
      (`src/lib/listening.ts` + `src/lib/useSpeech.ts`, pilih voice Inggris otomatis)
- [x] **3.4** Game **Listening Battle**: dengar kata/kalimat → pilih artinya
      (`/listening-battle`, tema studio audio `tex-sound`, aksen orange, visualizer gelombang suara,
      tombol "PUTAR ULANG", duel 2 tim berbagi satu audio + latihan mandiri, review bisa diputar ulang)
- [x] **3.5** ~~Cache audio TTS (opsional) untuk perangkat tanpa voice Inggris~~
      → **Tidak diperlukan:** mode guru manual sudah jadi fallback; cache audio ditunda.
- [x] **3.6** Game **Pronounce It** (speaking): rekam via Speech Recognition → skor kecocokan
      (`/pronounce-it`, tema panggung karaoke `tex-stage`, aksen pink, animasi mic berdenyut)
- [x] **3.7** Fallback: bila browser tak mendukung mic, mode **guru menilai manual**
      (toggle "Guru menilai manual" di menu) + pesan peringatan jelas saat mic gagal
- [~] **3.8** Bank konten awal: **12 teks reading + 37 pertanyaan**, **55 prompt listening**
      (40 kata + 15 kalimat) — target 30 teks/100 prompt menyusul di Fase 4.7
- [x] **3.9** Pastikan tiap game baru punya identitas visual unik (bukan template)
      → Reading: kertas perpustakaan + kartu bacaan putih; Listening: panel audio + bar suara beranimasi

**DoD:** Minimal 1 game Reading + 1 Listening + 1 Speaking jalan di papan,
dan datanya sudah berbentuk `Deck`/`Item` agar mudah dipindah ke Postgres di Fase 1.
→ **Status:** ✅ **FASE 3 TUNTAS.** Reading ✅ + Listening ✅ + Speaking ✅ jalan
   (15 rute HTTP 200). Data masih berupa bank TS lokal (`reading.ts`, `listening.ts`,
   `vocabulary.ts`) — siap dimigrasi ke `Item` di Fase 1.
   **Catatan:** Speaking butuh https/localhost (Speech Recognition tidak jalan di IP-LAN);
   mode guru manual jadi fallback.

---

### FASE 4 — Konten & Alat Guru (3–4 sesi)
- [ ] **4.1** **Import Excel/CSV** (pakai `data_input.xlsx` sebagai contoh) → Deck + Item
- [ ] **4.2** **Deck builder** di Panel Guru: buat deck baru, tambah item, pilih skill & level
- [ ] **4.3** **Assignments**: guru beri deck + tenggat ke kelas
- [ ] **4.4** **Export rapor** (CSV) per kelas: nama, XP, akurasi per skill
- [ ] **4.5** **Generate worksheet PDF** dari deck (latihan cetak)
- [ ] **4.6** **Generator sertifikat** sederhana (nama + pencapaian) → PNG/PDF
- [ ] **4.7** Bank soal bawaan diperluas: target **800+ kata**, 300 kalimat, 200 soal grammar

**DoD:** Guru bisa import Excel, buat deck, beri tugas, dan unduh rapor tanpa bantuan developer.

---

### FASE 5 — Turnamen & Kelas Seru (3–4 sesi)
- [ ] **5.1** **Turnamen/bracket** antar tim (otomatis atau manual)
- [ ] **5.2** **Generator tim acak** dari daftar kelas
- [ ] **5.3** **Mode buzzer**: kontrol keyboard host (tombol tim menyalip)
- [ ] **5.4** **Papan skor besar** khusus (mode display, tanpa kontrol, untuk proyektor)
- [ ] **5.5** **Multiplayer lintas perangkat** (SSE/WebSocket): 2 tim di 2 HP berbeda
- [ ] **5.6** **Leaderboard mingguan/bulanan** + reset otomatis
- [ ] **5.7** **Sound board** guru (efek sorak, drum roll, salah)

**DoD:** Bisa menggelar "English Day" turnamen antar kelas pakai platform ini.

---

### FASE 6 — Skala & Polish (opsional, berkelanjutan)
- [ ] **6.1** PWA (install di papan, jalan offline)
- [ ] **6.2** Skala Postgres (read replica / connection pooling) bila perlu multi-sekolah
- [ ] **6.3** Auth multi-guru & multi-kelas
- [ ] **6.4** Mode gelap/terang otomatis + aksesibilitas (kontras, ukuran font)
- [ ] **6.5** Dukungan bahasa UI: Indonesia / Inggris
- [ ] **6.6** Analitik lanjutan: heatmap soal tersulit, tren per kelas

---

## 7. Backlog Game Baru (prioritas)

| Prioritas | Game | Skill | Kenapa | Est. |
|-----------|------|-------|--------|------|
| 🔴 P1 | **Listening Battle** | Listening | Menutup lubang skill terbesar | 1 sesi |
| 🔴 P1 | **Reading Race** | Reading | Idem | 1 sesi |
| 🟡 P2 | **Word Search** | Vocabulary/Spelling | Murah dibuat, disukai siswa | 1 sesi |
| 🟡 P2 | **Bingo Kosakata** | Vocabulary | Seru untuk pemanasan | 1 sesi |
| 🟡 P2 | **Verb Conjugation** | Grammar | Tenses adalah materi inti SMP | 1 sesi |
| 🟢 P3 | **Pronounce It** | Speaking | Beda & menantang | 1–2 sesi |
| 🟢 P3 | **4 Pics 1 Word** | Vocabulary | Visual, menarik | 1 sesi |
| 🟢 P3 | **Grammar Auction** | Grammar | Strategi + grammar | 1 sesi |
| 🟢 P3 | **Jumbled Paragraph** | Sentence/Reading | Susun paragraf | 1 sesi |

> Aturan: setiap game baru **wajib** punya identitas visual unik (tekstur, aksen, font) —
> jangan sampai terasa "template AI" (lihat `README.md` §Identitas Visual).

---

## 8. Rencana Konten & Kurikulum

- **Struktur:** `Deck` → `Item` dengan tag `skill` + `level` (Grade 7/8/9 atau CEFR A1/A2/B1).
- **Sumber konten:**
  1. Buku paket sekolah (guru ketik/import)
  2. Bank bawaan yang diperluas (§4.7)
  3. Konten buatan siswa (kompetisi buat soal)
- **Target volume minimum:**
  - Vocabulary: 800 kata (sekarang 301)
  - Sentence: 300 kalimat (sekarang ~60)
  - Grammar: 200 soal
  - Reading: 30 teks pendek
  - Listening: 100 klip/prompt TTS
- **Pemetaan materi SMP (contoh):**
  - Kelas 7: To be, Simple Present, Greetings, Family, Things around us
  - Kelas 8: Present Continuous, Past Tense, Describing people, Recount
  - Kelas 9: Perfect tense, Passive, Procedure, Report, Narrative

---

## 9. UI/UX & Pengalaman Papan Besar

- [ ] **Mode display** (tanpa kursor/menu) untuk proyektor/papan
- [ ] **Tipografi** responsif: ukuran otomatis dari jauh (≥2 m)
- [ ] **Kontras tinggi** & hindari teks kecil di arena
- [ ] **Animasi transisi antar halaman** (View Transitions API)
- [ ] **Onboarding 30 detik** saat pertama pakai (tooltip)
- [ ] **Konsistensi**: semua game punya header, timer, tombol Menu & Fullscreen yang sama
- [ ] **Feedback** selalu jelas: benar/salah/skor/nyawa/combo

---

## 10. Non-Fungsional

| Aspek | Target |
|-------|--------|
| **Performa** | First load < 2s; arena 60fps |
| **Offline** | Game inti tetap jalan tanpa internet; sinkron saat online (offline-first) |
| **Keamanan** | PIN guru + auth sesi; HTTPS (Vercel); kredensial hanya di env var |
| **Aksesibilitas** | `prefers-reduced-motion` (sudah), kontras, navigasi keyboard |
| **Data** | Export penuh (JSON/CSV), tidak ada lock-in; PITR Postgres |
| **Uji** | Lint + TSC + build + unit test hijau sebelum rilis |
| **Browser** | Chrome/Edge modern (papan biasanya Chrome) |

---

## 11. Deployment & Operasional (Cloud)

**Alur (Fase C / Cloud):**
1. Deploy ke **Vercel** (otomatis dari repo). `DATABASE_URL` diisi ke env Vercel.
2. Papan & HP siswa buka URL Vercel (mis. `https://english-games.sekolah.vercel.app`).
3. Siswa masukkan kode/NISN → main; skor tersinkron ke Postgres.
4. Guru pantau leaderboard live (polling/SSE).
5. Backup otomatis (Neon/Supabase punya point-in-time restore) + export JSON berkala.

**Cadangan offline (WAJIB tetap ada):**
- Game inti jalan dari localStorage walau internet mati; antrian sinkron dikirim saat online.
- Bila internet sekolah tidak stabil, tetap bisa pakai **mode papan** tanpa sinkronisasi.

**Checklist sebelum "English Day":**
- [ ] Deploy Vercel sehat & `DATABASE_URL` aktif
- [ ] Data siswa sudah diimpor
- [ ] Deck untuk tiap game sudah diisi
- [ ] Audio & musik dites di papan
- [ ] Rencana cadangan bila internet mati (mode offline)

---

## 12. Keputusan Kunci

### ✅ Keputusan yang SUDAH diambil

| # | Pertanyaan | **Keputusan** | Konsekuensi |
|---|-----------|---------------|-------------|
| D1 | Server atau tetap offline? | **C — Cloud (Vercel + Postgres)** | Fase B (LAN) dilewati; langsung siapkan API + Postgres. Butuh internet saat sinkronisasi. |
| D2 | Database? | **Postgres** (Supabase/Neon) | Skema Prisma diarahkan ke Postgres, bukan SQLite. |
| D3 | Cakupan pengguna? | **1 sekolah dulu**, siap multi-kelas | Skema tetap mendukung banyak kelas/guru sejak awal. |
| D4 | Prioritas berikutnya? | **Reading + Listening** | Dikerjakan lebih dulu, sebelum migrasi server. |
| D5 | Siswa pakai perangkat sendiri? | **Ya** (papan + HP siswa) | Perlu identitas siswa & sinkronisasi (Fase 1–2). |

> **Urutan eksekusi yang disepakati:** Fase 0 (fondasi) → **Reading & Listening (Fase 3 dimajukan)**
> → Fase 1 (Cloud/Postgres) → Fase 2 → Fase 4 → Fase 5 → Fase 6.

**Catatan penting untuk arah Cloud:**
- Game inti **tetap harus jalan offline** (localStorage) sebagai fallback — cloud hanya
  menyinkronkan. Jadi kerjakan Reading/Listening dengan data lokal dulu, lalu pindahkan ke API.
- Pilih **Vercel + Neon/Supabase Postgres**. Prisma sebagai ORM.
- Tambahkan **env var** (`DATABASE_URL`, `OPENCODE_*` tidak dipakai) — jangan commit kredensial.

---

## 13. Metrik Keberhasilan

- **Adopsi:** dipakai ≥3 kelas/minggu; ≥80% siswa punya data skor
- **Pembelajaran:** rata-rata akurasi per skill naik ≥10% dalam 1 semester
- **Konten:** ≥800 kata & ≥200 soal grammar tersedia
- **Stabilitas:** 0 error kritis saat jam pelajaran; backup harian berhasil
- **Kepuasan:** guru bisa menyiapkan sesi < 10 menit

---

## 14. Risiko & Mitigasi

| Risiko | Dampak | Mitigasi |
|--------|--------|----------|
| Internet sekolah mati/tidak stabil | Siswa tak bisa sinkron | **Offline-first**: game jalan dari cache, antrian sinkron saat online |
| Vendor cloud down | Data tak bisa diakses | Cache lokal + export JSON berkala + PITR Postgres |
| Data hilang | Skor hilang | Backup otomatis (PITR) + export harian |
| Guru tak sempat input konten | Game kosong | Import Excel + bank bawaan besar |
| Fitur melebar tanpa selesai | Proyek mandek | Kerjakan per fase, DoD jelas |
| Audio TTS tak tersedia | Listening gagal | Fallback: rekaman guru / cache audio |
| Biaya cloud membengkak | Anggaran | Pakai tier gratis Neon/Supabase + Vercel hobby dulu |
| Kredensial di file lama bocor | Keamanan | Pindahkan ke `archive/`, jangan commit; env var saja |

---

## 15. Ringkasan Timeline (indikatif)

| Fase | Isi | Estimasi |
|------|-----|----------|
| **0** | Fondasi (CI, tes, data nyata) | 1–2 sesi |
| **3** | Reading & Listening (+Speaking) — **dikerjakan ke-2** | 4–5 sesi |
| **1** | Backend Cloud (Vercel + Postgres) — **dikerjakan ke-3** | 5–7 sesi |
| **2** | Identitas siswa + progres/XP | 3–4 sesi |
| **4** | Import Excel, deck builder, rapor | 3–4 sesi |
| **5** | Turnamen & multiplayer | 3–4 sesi |
| **6** | Skala & polish | berkelanjutan |

**Total ke "pusat yang matang": ± 19–26 sesi kerja.**

---

## 16. Langkah Pertama (mulai dari sini)

Keputusan sudah diambil (D1 = Cloud, D4 = Reading/Listening dulu). Maka langkah konkretnya:

1. **Fase 0** — pasang CI + tes, **isi data siswa nyata**, buat `CONTENT.md`. ✅ (data siswa nyata menunggu file guru)
2. **Fase 3.1–3.2** — tambah tipe item `reading` + game **Reading Race** (data lokal). ✅
3. **Fase 3.3–3.4** — tambah tipe item `listening` + game **Listening Battle** (TTS). ✅
4. **Fase 1.1–1.10** — Postgres (Supabase) + Prisma + API + sinkron offline + `/admin`. ✅
   → **Berikutnya:** isi `DATABASE_URL` Supabase asli, jalankan `db push` + `db seed`, lalu lanjut **Fase 2**.

> Rencana ini siap dieksekusi fase demi fase. Fase 0, 3, dan kode Fase 1 sudah selesai.
