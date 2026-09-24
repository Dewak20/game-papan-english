import type { Metadata } from "next";
import LeaderboardClient from "./LeaderboardClient";

export const metadata: Metadata = {
  title: "Papan Peringkat · Battle Learning Platform",
  description: "Peringkat skor terbaik dari sesi latihan mandiri siswa.",
};

export default function Page() {
  return <LeaderboardClient />;
}
