/** Tipe bersama untuk seluruh platform pembelajaran. */

export type TeamSide = "blue" | "red";

export interface AnimalQuestion {
  /** Kata target dalam bahasa Inggris, mis. "Elephant" */
  word: string;
  /** URL gambar yang mewakili kata tersebut */
  image: string;
}

export interface ContinuousQuestion {
  q: string;
  opts: [string, string];
  ans: 0 | 1;
}

export interface Student {
  nisn: string;
  nama: string;
  total_nilai: number;
}

export interface ReviewItem {
  word: string;
  expected: string;
}
