import type { Metadata } from "next";
import ListeningClient from "./ListeningClient";

export const metadata: Metadata = {
  title: "Listening Battle — Battle Learning Platform",
  description:
    "Game listening bahasa Inggris: dengarkan kata/kalimat yang diucapkan, lalu pilih artinya. Audio dibuat langsung oleh browser (TTS).",
};

export default function Page() {
  return <ListeningClient />;
}
