import type { Metadata } from "next";
import HangmanClient from "./HangmanClient";

export const metadata: Metadata = {
  title: "Hangman · Battle Learning Platform",
  description: "Game tebak kata Inggris berdasarkan petunjuk arti Indonesia.",
};

export default function Page() {
  return <HangmanClient />;
}
