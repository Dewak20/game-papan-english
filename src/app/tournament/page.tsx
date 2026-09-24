import type { Metadata } from "next";
import TournamentClient from "./TournamentClient";

export const metadata: Metadata = {
  title: "Turnamen Kelas · Battle Learning Platform",
  description:
    "Susun turnamen round-robin antar tim: pilih game, atur jumlah ronde, klasemen dihitung otomatis.",
};

export default function Page() {
  return <TournamentClient />;
}
