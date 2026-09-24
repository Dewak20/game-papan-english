import type { Metadata } from "next";
import AdminClient from "./AdminClient";

export const metadata: Metadata = {
  title: "Admin · Battle Learning Platform",
  description:
    "Status cloud, sinkronisasi data, dan tautan cepat untuk perangkat siswa.",
};

export default function Page() {
  return <AdminClient />;
}
