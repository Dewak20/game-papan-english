# CONTENT.md — Peta Konten & Cakupan Skill

Dokumen ini memetakan **semua bank soal** di platform: di mana datanya, skill apa
yang dilatih, dan level kesulitannya. Tujuannya agar konten antar-game tidak
tumpang tindih dan guru mudah tahu apa yang tersedia.

> Angka di bawah ini adalah hasil hitung langsung dari kode (per commit terakhir).
> Sumber utama tetap `src/lib/*.ts` (offline-first). Bila **cloud aktif** (`DATABASE_URL`
> terisi), bank yang sama tersedia di Postgres sebagai tabel `decks` + `items` —
> bisa dicek & diisi lewat `npm run db:seed` atau Prisma Studio (`npm run db:studio`).

---

## 1. Matriks Skill → Game → Bank Data

| Skill | Game | Sumber data | Jumlah soal |
| --- | --- | --- | --- |
| **Vocabulary** (arti kata) | Vocabulary Match | `vocabulary.ts` → `vocabPairs` | 301 kata / 9 kategori |
| **Vocabulary** (mengeja) | Spelling Battle | `words.ts` → `animalWords` + Pollinations image | 100 kata |
| **Vocabulary** (visual) | **Tebak Gambar** | `picture.ts` → `pictureItems` + Pollinations image | **70 gambar / 6 kategori** |
| **Vocabulary** (huruf) | Hangman | `vocabulary.ts` → `vocabPairs` (EN) | 301 kata |
| **Vocabulary** (susun huruf) | Anagram | `vocabulary.ts` → `vocabPairs` (EN) | 301 kata |
| **Vocabulary** (memori) | Memory Match | `vocabulary.ts` → `vocabPairs` | 301 kata |
| **Sentence** (susun kalimat) | Sentence Battle | `sentences.ts` → `defaultSentences` | 132 kalimat |
| **Grammar / Klasifikasi** | Word Battle | `words.ts` → nouns/verbs/adjectives | 109 + 84 + 91 = 284 kata |
| **Grammar** (pilihan cepat) | Continuous Battle | `questions.ts` | lihat bank grammar |
| **Reading** (pemahaman) | **Reading Race** | `reading.ts` → `readingPassages` | **12 teks / 37 pertanyaan** |
| **Listening** (dengar → arti) | **Listening Battle** | `listening.ts` → `listeningItems` | **55 soal (40 kata + 15 kalimat)** |
| **Speaking** (pengucapan) | **Pronounce It** | `vocabulary.ts` → `vocabPairs` | **301 kata** |

### Ringkasan cakupan
- ✅ **Vocabulary** — sangat kuat (7 game, 301 kata bersama + 70 gambar).
- ✅ **Reading** — 1 game, 12 teks.
- ✅ **Listening** — 1 game, 55 soal, audio TTS browser.
- ✅ **Speaking** — 1 game, 301 kata, dinilai via Speech Recognition + mode guru manual.
- ⏳ **Writing** — belum ada (rencana: *Jumbled Paragraph*, backlog).

---

## 2. Detail per Bank

### 2.1 `vocabulary.ts` — 301 pasangan EN ↔ ID
Dipakai oleh **5 game** (Vocabulary Match, Hangman, Anagram, Memory Match, Listening).
Kategori (9):

| Kategori | Contoh |
| --- | --- |
| Hewan | cat, dog, elephant, tiger |
| Buah | apple, banana, mango, grape |
| Makanan | rice, bread, noodle, soup |
| Warna | red, blue, green, purple |
| Angka | one, two, ten, hundred |
| Benda | table, chair, book, pen |
| Tempat | school, market, beach, hospital |
| Keluarga | father, mother, sister, uncle |
| Sekolah | teacher, student, exam, homework |

**Aturan penting:** setiap kata Inggris hanya muncul **sekali** di seluruh bank
(dijaga oleh unit test `vocabulary.test.ts`) supaya tidak ada soal ambigu.

### 2.2 `reading.ts` — 12 teks, 3 level
Tiap teks punya **3 pertanyaan** dengan **3 pilihan** (satu benar).

| Level | Label UI | Teks | Contoh judul |
| --- | --- | --- | --- |
| easy | Mudah | 4 | My Day, My Cat, My School, Fruits |
| medium | Sedang | 4 | A Trip to the Zoo, The Honest Boy, Recycling, My Favourite Teacher |
| hard | Sulit | 4 | The Importance of Reading, Technology in Education, Saving the Environment, A Volunteer Experience |

Fungsi: `readingByLevel(level)` (filter), `buildReadingRound(pool, prev)` (pilih babak).

### 2.3 `listening.ts` — 55 soal, 2 jenis
Audio **tidak memakai file** — dibangkitkan **Web Speech API (TTS)** di browser.

| Jenis (`kind`) | Level | Jumlah | Isi |
| --- | --- | --- | --- |
| `word` | easy | 40 | Dengar 1 kata → pilih arti Indonesia (distraktor mirip bunyi) |
| `sentence` | medium | 15 | Dengar 1 kalimat → pilih arti yang tepat |

Fungsi: `listeningByLevel(level)`, `buildListeningItem(pool, prev)`.

> **Catatan perangkat:** butuh browser dengan voice bahasa Inggris
> (Chrome/Edge terbaru). Bila tidak ada, game menampilkan peringatan.

### 2.4 `pronounce.ts` — penilaian pengucapan
Memakai kembali **301 kata** dari `vocabulary.ts`. Menilai dengan **jarak edit
Levenshtein** antara kata target dan yang didengar browser:
- ratio ≥ 0.85 → **benar** (✅ TEPAT)
- ratio ≥ 0.6 → **hampir benar** (🟡, poin sebagian)
- selain itu → **belum tepat** (❌)

Contoh: `elephant` vs `elepant` = ratio 0.875 (benar); `elephant` vs `elefant` = 0.75 (hampir).

### 2.5 `sentences.ts` — 132 kalimat
Untuk **Sentence Battle**. Dibagi otomatis per kesulitan berdasarkan jumlah kata:
- **easy** ≤ 4 kata · **medium** 5–7 kata · **hard** ≥ 8 kata.

### 2.6 `words.ts` — bank klasifikasi
- `nouns` (109) · `verbs` (84) · `adjectives` (91) → **Word Battle**
- `animalWords` (100) → **Spelling Battle** (gambar via Pollinations AI, butuh internet)

### 2.7 `picture.ts` — 70 gambar, 6 kategori
Untuk **Tebak Gambar**: tampilkan satu gambar → pilih nama Inggris dari **4 opsi**.
Gambar dibangkitkan otomatis (Pollinations AI) lewat `imageUrlFor`, jadi tidak ada
file gambar di repo.

| Kategori | Jumlah | Contoh |
| --- | --- | --- |
| Hewan | 20 | cat, elephant, dolphin, crocodile |
| Buah | 10 | apple, watermelon, pineapple |
| Makanan | 10 | pizza, burger, ice cream |
| Benda | 10 | camera, guitar, umbrella |
| Tempat | 10 | school, beach, bridge |
| Transportasi | 10 | bicycle, helicopter, rocket |

Fungsi: `pictureByCategory(kategori)` (filter), `buildPictureQuestion(pool, prev)`
(pilih soal + 3 pengecoh dari kategori sama, posisi diacak). Setiap kata Inggris
dan artinya **unik** (dijaga unit test `picture.test.ts`).

---

## 3. Pemetaan ke Database (Fase 1.3)

Saat seed dijalankan (`npm run db:seed`), tiap bank berikut jadi satu **Deck**
di Postgres (`src/lib/decks.ts` membangun strukturnya):

| Id deck | Sumber bank | Skill |
| --- | --- | --- |
| `deck-vocab-<kategori>` (9 deck) | `vocabulary.ts` | `vocabulary` |
| `deck-word-class` | `words.ts` (nouns/verbs/adjectives) | `word-class` |
| `deck-animals` | `words.ts` (`animalWords`) | `spelling` |
| `deck-grammar-continuous` | `questions.ts` | `grammar` |
| `deck-sentences` | `sentences.ts` | `sentence` |
| `deck-reading` | `reading.ts` | `reading` |
| `deck-listening` | `listening.ts` | `listening` |
| `deck-pictures` | `picture.ts` | `picture` |

Pemetaan per item:

- `vocab` → `prompt`=kata Inggris, `answer`=arti, `hint`=kategori
- `reading` → `prompt`=pertanyaan, `answer`=pilihan benar, `media`=isi teks, `hint`=judul
- `listening` → `prompt`=teks yang diucapkan TTS, `media`=`kind`, `hint`=prompt tampilan
- `picture` → `prompt`=`media`=URL gambar, `answer`=kata Inggris, `hint`=kategori

Seed **idempoten**: id deck tetap, jadi dijalankan ulang hanya me-refresh isi.

---

## 4. Aturan Menambah Konten

1. **Vocabulary:** tambahkan ke `BANK` di `vocabulary.ts` pada kategori yang sesuai.
   Pastikan kata Inggris **belum ada** (unit test akan gagal bila duplikat).
2. **Reading:** tambahkan objek ke `readingPassages` dengan `id` unik berawalan `r-`,
   pilih `level`, dan 3 pertanyaan. Setiap pertanyaan: 3 opsi unik + `answer` (0–2).
3. **Listening:** tambahkan ke `WORD_ITEMS` (kata) atau `SENTENCE_ITEMS` (kalimat).
   Untuk kata, isi `distractors` (2 pengecoh) — posisi jawaban diputar otomatis.
4. **Kalimat:** tambahkan ke `defaultSentences`, pisahkan dengan `|`.
5. **Pronounce It** otomatis memakai bank kosakata yang sama — tidak perlu bank terpisah.
6. **Tebak Gambar:** tambahkan objek ke `BANK` di `picture.ts` pada kategori yang sesuai
   (`{ en, id }`). Pastikan kata Inggris **dan** artinya belum ada (unit test akan gagal
   bila duplikat). Hanya pakai kata **konkret & mudah digambar** (hindari kata abstrak).
7. Setelah menambah, **jalankan `npm test`** untuk memvalidasi bank.

---

## 5. Backlog Konten (Fase 4.7)

Target jangka panjang agar bank soal lebih kaya:

| Bank | Sekarang | Target |
| --- | --- | --- |
| Kata (vocabulary) | 301 | 800+ |
| Kalimat | 132 | 300 |
| Reading | 12 teks | 30 teks |
| Listening | 55 | 100+ |
| Gambar (Tebak Gambar) | 70 | 150+ |
| Grammar | — | 200 soal |
| Speaking | 0 | (game baru) |

---

*Terakhir diperbarui bersamaan dengan penambahan Tebak Gambar.*
