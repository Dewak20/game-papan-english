import type { Metadata } from "next";
import PronounceClient from "./PronounceClient";

export const metadata: Metadata = {
  title: "Pronounce It — Battle Learning Platform",
  description:
    "Latihan pengucapan bahasa Inggris: ucapkan kata ke mikrofon, browser menilai kemiripannya. Ada mode guru manual bila mic tidak tersedia.",
};

export default function Page() {
  return <PronounceClient />;
}
