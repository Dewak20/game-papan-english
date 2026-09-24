import type { Metadata } from "next";
import SettingsClient from "./SettingsClient";

export const metadata: Metadata = {
  title: "Panel Guru · Battle Learning Platform",
  description: "Kelola data siswa dan bank soal untuk seluruh permainan.",
};

export default function Page() {
  return <SettingsClient />;
}
