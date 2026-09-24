import type { Metadata } from "next";
import SpellingBattleClient from "./SpellingBattleClient";

export const metadata: Metadata = {
  title: "Spelling Battle · Battle Learning Platform",
  description: "Game mengeja kata bahasa Inggris dari gambar untuk dua tim.",
};

export default function Page() {
  return <SpellingBattleClient />;
}
