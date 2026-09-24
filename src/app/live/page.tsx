import type { Metadata } from "next";
import { Suspense } from "react";
import LiveClient from "./LiveClient";

export const metadata: Metadata = {
  title: "Ruang Kelas · Battle Learning Platform",
  description:
    "Turnamen lintas perangkat: papan besar sebagai server, HP siswa untuk mengirim skor.",
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <LiveClient />
    </Suspense>
  );
}
