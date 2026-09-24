import type { Metadata } from "next";
import VocabularyClient from "./VocabularyClient";

export const metadata: Metadata = {
  title: "Vocabulary Match · Battle Learning Platform",
  description: "Game menjodohkan kata Inggris dengan arti Indonesianya.",
};

export default function Page() {
  return <VocabularyClient />;
}
