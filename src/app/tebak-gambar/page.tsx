import type { Metadata } from "next";
import TebakGambarClient from "./TebakGambarClient";

export const metadata: Metadata = {
  title: "Tebak Gambar · Battle Learning Platform",
  description:
    "Game menebak gambar: lihat foto, pilih nama bahasa Inggris yang benar dari empat pilihan. Duel 2 tim atau latihan mandiri.",
};

export default function Page() {
  return <TebakGambarClient />;
}
