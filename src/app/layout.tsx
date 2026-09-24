import type { Metadata, Viewport } from "next";
import { Fredoka, Poppins, Orbitron, Patrick_Hand } from "next/font/google";
import { CloudBoot } from "@/components/CloudBoot";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";
import "./globals.css";

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  weight: ["400", "600"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "600", "800"],
});

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["700", "900"],
});

const patrick = Patrick_Hand({
  variable: "--font-patrick",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "Battle Learning Platform",
  description:
    "Platform pembelajaran interaktif berbasis permainan untuk layar papan besar kelas.",
  applicationName: "Battle Learning Platform",
  appleWebApp: {
    capable: true,
    title: "BattleLearn",
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#05070f",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={`${fredoka.variable} ${poppins.variable} ${orbitron.variable} ${patrick.variable} h-full`}
    >
      <body className="min-h-full">
        <CloudBoot />
        <ServiceWorkerRegistrar />
        {children}
      </body>
    </html>
  );
}
