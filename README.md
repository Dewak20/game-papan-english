# Battle Learning Platform

Platform pembelajaran interaktif berbasis permainan untuk **layar papan besar kelas**.
Menggabungkan 12 game edukatif Bahasa Inggris + halaman penilaian siswa ke dalam satu
aplikasi web.

Dibangun dengan **Next.js 16 (App Router) + TypeScript + Tailwind CSS v4**.

## 🎮 Daftar Modul

| Route                | Modul             | Deskripsi                                              |
| -------------------- | ----------------- | ------------------------------------------------------ |
| `/`                  | Beranda           | Dashboard pemilihan modul                              |
| `/word-battle`       | Word Battle       | Klasifikasi Noun · Verb · Adjective (duel 2 tim)       |
| `/spelling-battle`   | Spelling Battle   | Tebak nama hewan dari gambar (ketik huruf per huruf)   |
| `/sentence-battle`   | Sentence Battle   | Susun kata acak jadi kalimat (tarik tambang)           |
| `/continuous-battle` | Continuous Battle | Grammar Present Continuous (am/is/are + verb-ing)      |
| `/vocabulary-match`  | Vocabulary Match  | Pilih arti Indonesia dari kata Inggris (12 kategori)   |
| `/hangman`           | Hangman           | Tebak kata Inggris huruf per huruf dari artinya        |
| `/anagram`           | Anagram           | Susun huruf acak jadi kata Inggris                     |
| `/memory-match`      | Memory Match      | Balik kartu & jodohkan kata dengan artinya             |
| `/reading-race`      | Reading Race      | Baca teks pendek, jawab pertanyaan pemahaman (3 level) |
| `/listening-battle`  | Listening Battle  | Dengar kata/kalimat (TTS), pilih artinya              |
| `/pronounce-it`      | Pronounce It      | Ucapkan kata ke mic, dinilai otomatis (Speech Rec.)   |
| `/tebak-gambar`      | Tebak Gambar      | Lihat gambar, pilih nama Inggris (4 opsi)             |
| `/rank`              | Cek Ranking       | Cek ranking & nilai siswa berdasarkan NISN             |
| `/leaderboard`       | Papan Peringkat   | Skor terbaik dari sesi Latihan Mandiri (live cloud)   |
| `/settings`          | Panel Guru        | Kelola data siswa & bank soal (dilindungi PIN)         |
| `/admin`             | Admin             | Status cloud, sinkronisasi, cadangan data, tautan/QR siswa |

## 🧑‍🎓 Dua Tipe Permainan

Setiap game punya **dua tipe** yang bisa dipilih di menu:

- **👥 Duel 2 Tim** — dua tim (Blue vs Red) berlomba di papan besar. Cocok untuk kompetisi kelas.
- **🧑 Latihan Mandiri** — satu pemain berlatih sendiri, lalu skornya bisa disimpan ke
  **Papan Peringkat** (`/leaderboard`). Cocok untuk siswa berlatih atau guru mendemokan.

## 🖥️ Fitur Papan Besar

- **Tombol ⛶ Layar Penuh** di setiap halaman — tampilan maksimal tanpa gangguan.
- **Panel Guru dilindungi PIN** (bawaan `1234`, bisa diganti di tab *Cadangkan*) agar
  siswa tidak bisa mengubah data.
- **Ingat nama pemain** — saat menyimpan skor, nama terakhir otomatis terisi.
- Kontras tinggi & tombol besar, dioptimalkan untuk layar kelas.

## 🎨 Identitas Visual Tiap Game

Setiap game punya "kulit" (skin) dan nuansa sendiri supaya tidak terasa seragam:

| Game               | Tema visual                     | Aksen     |
| ------------------ | ------------------------------- | --------- |
| Word Battle        | Arena neon arcade + scanline    | Biru neon |
| Spelling Battle    | Savana safari + bingkai foto    | Emas      |
| Sentence Battle    | Arena tarik tambang (siang)     | Merah     |
| Continuous Battle  | Lab waktu + roda gigi           | Violet    |
| Vocabulary Match   | Papan tulis kapur               | Hijau     |
| Hangman            | Tiang gantungan + kayu          | Violet    |
| Anagram            | Meja kayu + ubin scrabble       | Emas      |
| Memory Match       | Meja kasino + kartu flip 3D     | Emas      |
| Reading Race       | Perpustakaan + kartu bacaan putih | Teal    |
| Listening Battle   | Studio audio + bar gelombang suara | Oranye |
| Pronounce It       | Panggung karaoke + lampu sorot  | Pink      |
| Tebak Gambar       | Galeri foto + bingkai putih     | Lime      |

**Efek "juice" bersama** (`src/components/juice.tsx`) membuat permainan terasa hidup:
confetti saat menang, ledakan partikel saat benar, kilatan layar, angka skor melayang,
bar combo/streak, dan hitung mundur 3-2-1-GO beranimasi.

**Suara** (`src/lib/useSound.ts`) kini berupa rangkaian nada (arpeggio) — lebih hidup
daripada satu nada: `correct`, `wrong`, `coin`, `combo`, `win`, `finish`, `lose`, dll.

**Musik latar per game** (`src/lib/useMusic.ts` + `src/lib/musicThemes.ts`) dibangkitkan
secara prosedural lewat Web Audio (tanpa file audio) — setiap game punya tema sendiri
(arcade neon, safari, tarik tambang, lab waktu, papan tulis, dsb.) dan berhenti otomatis
di luar permainan.

**Getar layar** (`src/lib/useScreenShake.ts`) memakai Web Animations API: layar bergetar
saat jawaban salah. Elemen akar game ditandai `id="blp-game-root"` agar tidak perlu `ref`.

**Bonus kecepatan** (`src/lib/scoring.ts`): makin cepat menjawab, makin besar bonusnya
(muncul sebagai angka melayang ber-ikon ⚡). Petunjuknya tampil di menu tiap game.

**Kontrol audio** (`src/components/AudioToggles.tsx`) ada di header setiap game dan di
beranda — guru bisa mematikan efek suara atau musik latar kapan saja (tersimpan di
localStorage).

> Semua efek menghormati `prefers-reduced-motion` (otomatis redup bagi pengguna yang
> mengaktifkan pengurangan animasi di sistem).

## 📖 Reading & Listening

Dua game baru melengkapi 4 skill utama bahasa Inggris:

- **Reading Race** (`/reading-race`) — 12 teks pendek (3 level: Mudah/Sedang/Sulit),
  tiap teks 3 pertanyaan pemahaman. Kartu bacaan bergaya kertas + tema perpustakaan.
- **Listening Battle** (`/listening-battle`) — audio **dibangkitkan browser** lewat
  **Web Speech API (TTS)** tanpa file audio. Soal *kata* (40) & *kalimat* (15).
  Di mode duel, kedua tim mendengar audio yang sama lalu berebut menjawab;
  ada tombol **PUTAR ULANG** dan review akhir yang bisa diputar lagi per soal.

> ⚠️ Listening Battle butuh browser dengan voice bahasa Inggris (Chrome/Edge terbaru).
> Audio TTS **tidak** ikut mati saat efek suara (SFX) dimatikan, karena ia adalah isi
> permainan — bukan efek suara.

## 🗣️ Speaking — Pronounce It

`/pronounce-it` melatih pengucapan: siswa melihat kata Inggris + artinya, menekan tombol
mikrofon, lalu mengucapkannya. Browser menilai **kemiripan** pengucapan (jarak edit
Levenshtein) dan memberi poin: ✅ tepat, 🟡 hampir benar, atau ❌ belum tepat.

- **Butuh izin mikrofon** dan **secure context** (https atau `localhost`).
  Diakses lewat `http://<IP-LAN>:3000` fitur pengenalan suara **tidak aktif**.
- **Mode Guru manual** — bila mic tidak tersedia/diinginkan, guru menilai sendiri
  dengan tombol ✔ Benar / ✘ Salah.
- Ada tombol **🔊 DENGARKAN CONTOH** (TTS) agar siswa tahu pengucapan yang benar.

> ⚠️ Speech Recognition didukung Chrome/Edge (Chromium). Firefox & Safari terbatas.

## 🖼️ Vocabulary Visual — Tebak Gambar

`/tebak-gambar` menampilkan satu gambar, lalu siswa memilih **nama bahasa Inggris**
yang benar dari **4 pilihan**. Berbeda dari Spelling Battle (yang mengetik), di sini
siswa cukup menekan pilihan — cepat dan cocok untuk rebutan di papan.

- **6 kategori**: Hewan, Buah, Makanan, Benda, Tempat, Transportasi.
- Gambar dibangkitkan otomatis lewat **Pollinations AI** (sama seperti Spelling Battle),
  jadi tidak perlu file gambar. Butuh internet untuk memuat gambar.
- Bisa **Duel 2 Tim** (kedua tim menjawab soal yang sama) atau **Latihan Mandiri**.

> ⚠️ Karena gambar dibuat AI, butuh koneksi internet. Bila gambar lambat muncul,
> kartu menampilkan indikator "Menyiapkan gambar…".

## 🚀 Menjalankan

```bash
npm install
npm run dev      # development → http://localhost:3000
npm run build    # build produksi
npm run start    # jalankan hasil build
npm run lint     # cek ESLint
```

Untuk dipakai di papan besar, jalankan `npm run build` lalu `npm run start`, dan buka
`http://<IP-komputer>:3000` dari perangkat papan. IP lokal muncul saat menjalankan dev/start.

## 📁 Struktur

```
src/
├─ app/
│  ├─ layout.tsx              # root layout + font
│  ├─ page.tsx                # beranda (dashboard modul)
│  ├─ word-battle/            # game klasifikasi kata
│  ├─ spelling-battle/        # game mengeja dari gambar
│  ├─ sentence-battle/        # game susun kalimat
│  ├─ continuous-battle/      # game present continuous
│  ├─ vocabulary-match/       # game jodohkan kosakata
│  ├─ hangman/                # game tebak kata
│  ├─ anagram/                # game susun huruf
│  ├─ memory-match/           # game kartu memori
│  ├─ reading-race/           # game pemahaman bacaan (Reading)
│  ├─ listening-battle/       # game dengar & pilih arti (Listening, TTS)
│  ├─ pronounce-it/           # game latihan pengucapan (Speaking, Speech Rec.)
│  ├─ tebak-gambar/           # game lihat gambar & pilih kata (Vocabulary visual)
│  ├─ rank/                   # halaman cek ranking
│  ├─ leaderboard/            # papan peringkat skor (live via cloud)
│  ├─ settings/               # panel guru (kelola data & soal, PIN)
│  ├─ admin/                  # status cloud, sinkronisasi, tautan/QR siswa
│  ├─ api/                    # Route Handlers (backend cloud)
│  │  ├─ auth/                #   login/logout guru (PIN → cookie HMAC)
│  │  ├─ health/              #   status database
│  │  ├─ students/            #   GET/POST daftar siswa
│  │  ├─ results/             #   GET leaderboard / POST skor (idempoten)
│  │  ├─ classes/  decks/     #   data kelas & deck soal
│  │  └─ export/              #   backup JSON (khusus guru)
│  ├─ error.tsx               # error boundary (fallback UI saat error)
│  ├─ global-error.tsx        # error boundary tingkat root
│  └─ not-found.tsx           # halaman 404 kustom
├─ components/                # UI bersama
│  ├─ GameChrome.tsx          # header & timer (aksen per game)
│  ├─ ui.tsx                  # tombol & overlay bertema
│  ├─ juice.tsx               # efek: confetti, burst, flash, countdown
│  ├─ SaveScoreDialog.tsx     # dialog simpan skor latihan
│  ├─ CloudBoot.tsx           # penyalin mesin sinkron cloud saat app dimuat
│  ├─ AudioToggles.tsx        # tombol nyala/mati efek suara & musik
│  └─ FullscreenButton.tsx    # tombol layar penuh
└─ lib/
   ├─ store.ts                # store terpusat (localStorage) + sinkron siswa
   ├─ scores.ts               # store skor latihan mandiri (localStorage) + cloud
   ├─ sync.ts                 # mesin sinkron cloud (antrian offline, polling)
   ├─ decks.ts                # pembuat Deck/Item dari bank lokal (untuk seed)
   ├─ db.ts                   # klien Prisma (server-only)
   ├─ auth.ts                 # auth guru (PIN → cookie HMAC)
   ├─ http.ts                 # helper Route Handler (ok/fail/noDb)
   ├─ pin.ts                  # PIN Panel Guru (localStorage + sessionStorage)
   ├─ words.ts                # bank kata noun/verb/adjective + hewan
   ├─ vocabulary.ts           # bank kosakata Inggris↔Indonesia (9 kategori)
   ├─ reading.ts              # bank bacaan + pertanyaan (Reading Race)
   ├─ listening.ts            # bank soal listening (Listening Battle)
   ├─ picture.ts              # bank gambar + soal pilihan (Tebak Gambar)
   ├─ pronounce.ts            # penilaian pengucapan (Levenshtein) — Pronounce It
   ├─ sentences.ts            # bank kalimat
   ├─ questions.ts            # bank soal present continuous
   ├─ students.ts             # data siswa + logika ranking
   ├─ games.ts                # daftar game (judul, aksen, skill)
   ├─ useJuice.ts             # state efek (teks melayang, burst, flash)
   ├─ useSound.ts             # sistem suara (Web Audio, arpeggio)
   ├─ audio.ts                # AudioContext bersama (SFX + musik)
   ├─ audioSettings.ts        # pengaturan efek suara & musik (localStorage)
   ├─ useMusic.ts             # mesin musik latar prosedural
   ├─ musicThemes.ts          # tema musik per game
   ├─ useScreenShake.ts       # getar layar (Web Animations API)
   ├─ useSpeech.ts            # Text-to-Speech (Web Speech API) untuk Listening
   ├─ useSpeechRecognition.ts # Speech Recognition (mic) untuk Pronounce It
   ├─ scoring.ts              # bonus skor kecepatan
   ├─ clock.ts                # pembungkus Date.now()
   ├─ useCountdown.ts         # hitung mundur 3-2-1
   └─ types.ts                # tipe bersama
```

## ✏️ Cara Mengubah Data

Ada **dua cara**:

### 1. Lewat Panel Guru (tanpa kode) — disarankan
Buka **`/settings`** dari tombol ⚙️ di beranda. Di sana guru dapat:
- **Data Siswa** — impor massal (format `NISN,Nama,Nilai` per baris).
- **Bank Kalimat** — edit bank soal Sentence Battle.
- **Soal Grammar** — edit soal Continuous Battle (`SOAL | OPSI1 | OPSI2 | JAWABAN`).
- **Kosakata** — edit bank Vocabulary Match & Hangman (`english = indonesia [Kategori]`).
- **Bank Kata** — edit daftar Noun/Verb/Adjective/Animals.
- **Cadangkan** — ekspor/impor JSON untuk pindah perangkat, reset ke bawaan, ganti PIN.

> Perubahan disimpan di `localStorage` browser dan **langsung dipakai** oleh semua game
> (via store terpusat `src/lib/store.ts`). Tidak perlu build ulang.

### 2. Lewat file (untuk nilai bawaan / default)
- **Data siswa** → `src/lib/students.ts`
- **Bank kalimat** → `src/lib/sentences.ts`
- **Soal Present Continuous** → `src/lib/questions.ts`
- **Bank kata & hewan** → `src/lib/words.ts`
- **Bank bacaan (Reading)** → `src/lib/reading.ts`
- **Bank soal Listening** → `src/lib/listening.ts`
- **Bank gambar (Tebak Gambar)** → `src/lib/picture.ts`

Nilai bawaan ini dipakai saat pertama kali dibuka atau setelah **Reset ke Bawaan**.

> 📚 **Peta konten lengkap** (skill → game → bank data) ada di [`CONTENT.md`](./CONTENT.md).

## 🧪 Pengujian & CI

- **Unit test** (Vitest) untuk logika murni — jalankan `npm test` (atau `npm run test:watch`).
- **CI** (GitHub Actions, `.github/workflows/ci.yml`) menjalankan lint → type-check →
  test → build di setiap push/PR.

## ☁️ Backend Cloud (Supabase + Prisma)

Platform berjalan **offline-first**: `localStorage` tetap sumber data utama, dan aplikasi
tetap berfungsi penuh **tanpa** `DATABASE_URL`. Cloud bersifat *additif* — begitu database
diisi, skor & data siswa otomatis disinkronkan.

### Mengaktifkan cloud

1. Buat project di [Supabase](https://supabase.com) → salin connection string.
2. Salin `.env.example` → `.env`, isi `DATABASE_URL` (pooler, port 6543) dan
   `DIRECT_URL` (direct, port 5432).
3. Buat tabel & isi data awal:

   ```bash
   npx prisma db push     # atau: npx prisma migrate dev
   npx prisma db seed     # pindahkan bank soal & siswa lokal ke Postgres
   ```

4. Buka **`/admin`** untuk melihat status koneksi dan menekan **“Unggah Data Lokal”**
   (memindahkan data yang sudah ada di browser ke cloud).

### Cara kerja

- **Skor** (`scores.ts`) → `POST /api/results` memakai `clientId` unik sehingga
  pengiriman ulang **tidak menghasilkan duplikat** (idempoten).
- **Antrian offline** (`sync.ts`) → bila jaringan/DB putus, skor disimpan di antrian
  `localStorage` dan dikirim otomatis saat online (listener `online` + retry 15 detik).
- **Leaderboard live** (`/leaderboard`) → menarik skor cloud tiap 5 detik dan
  menggabungkannya dengan skor lokal (dedup per `id`).
- **Auth guru** (`/api/auth`) → PIN (bawaan `1234`) ditukar cookie sesi bertanda-tangan
  HMAC (`node:crypto`, tanpa dependensi tambahan). Endpoint tulis hanya untuk guru.

### Perintah basis data

| Perintah            | Fungsi                                          |
| ------------------- | ----------------------------------------------- |
| `npm run db:push`   | Sinkronkan skema ke database (tanpa migrasi)    |
| `npm run db:migrate`| Buat & jalankan migrasi Prisma                  |
| `npm run db:seed`   | Isi database dengan bank soal & data siswa      |
| `npm run db:studio` | Buka Prisma Studio (lihat/ubah data)            |

> Env var yang dikenali: `DATABASE_URL`, `DIRECT_URL`, `TEACHER_PIN`, `AUTH_SECRET`
> (lihat `.env.example`). **Jangan pernah commit file `.env`.**

## 🔧 Catatan Migrasi

Platform ini menggabungkan file HTML lama (di root folder induk). Dua endpoint Google
Apps Script pada versi lama **tidak lagi dibutuhkan** — datanya kini dikelola lokal:

- Soal gambar (`game.html`) → dibangun dari daftar hewan di store (`/settings`).
- Data ranking (`rank.html`) → dihitung dari data siswa di store (`/settings`).

Gambar hewan dihasilkan otomatis dari [Pollinations AI](https://pollinations.ai)
(domain diizinkan di `next.config.ts`).

---

© Dewa Krishnadana · Battle Learning Platform
