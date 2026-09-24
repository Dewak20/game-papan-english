import type { Metadata } from "next";
import SentenceBattleClient from "./SentenceBattleClient";

export const metadata: Metadata = {
  title: "Sentence Battle · Battle Learning Platform",
  description: "Game menyusun kata acak menjadi kalimat yang benar untuk dua tim.",
};

export default function Page() {
  return <SentenceBattleClient />;
}
