import type { Metadata } from "next";
import ReadingClient from "./ReadingClient";

export const metadata: Metadata = {
  title: "Reading Race — Battle Learning Platform",
  description:
    "Game pemahaman bacaan bahasa Inggris: baca teks pendek lalu jawab pertanyaannya secepat mungkin.",
};

export default function Page() {
  return <ReadingClient />;
}
