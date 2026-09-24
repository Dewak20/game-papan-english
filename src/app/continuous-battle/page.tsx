import type { Metadata } from "next";
import ContinuousClient from "./ContinuousClient";

export const metadata: Metadata = {
  title: "Continuous Battle · Battle Learning Platform",
  description: "Game grammar Present Continuous (am/is/are dan bentuk -ing).",
};

export default function Page() {
  return <ContinuousClient />;
}
