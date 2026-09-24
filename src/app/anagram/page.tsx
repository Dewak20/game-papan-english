import type { Metadata } from "next";
import AnagramClient from "./AnagramClient";

export const metadata: Metadata = {
  title: "Anagram · Battle Learning Platform",
  description: "Game menyusun huruf acak menjadi kata Inggris sesuai petunjuk artinya.",
};

export default function Page() {
  return <AnagramClient />;
}
