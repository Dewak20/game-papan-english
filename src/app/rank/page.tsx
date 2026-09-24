import type { Metadata } from "next";
import RankClient from "./RankClient";

export const metadata: Metadata = {
  title: "Cek Ranking · Battle Learning Platform",
  description: "Lihat ranking dan total nilai siswa berdasarkan NISN.",
};

export default function Page() {
  return <RankClient />;
}
