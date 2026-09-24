import type { Metadata } from "next";
import WordBattleClient from "./WordBattleClient";

export const metadata: Metadata = {
  title: "Word Battle · Battle Learning Platform",
  description: "Game klasifikasi Noun, Verb, dan Adjective untuk dua tim.",
};

export default function Page() {
  return <WordBattleClient />;
}
