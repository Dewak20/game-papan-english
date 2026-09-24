import type { Metadata } from "next";
import MemoryClient from "./MemoryClient";

export const metadata: Metadata = {
  title: "Memory Match · Battle Learning Platform",
  description: "Game membalik kartu untuk menjodohkan kata Inggris dengan artinya.",
};

export default function Page() {
  return <MemoryClient />;
}
