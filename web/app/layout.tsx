import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import { AmbientBackground } from "@/components/AmbientBackground";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Transit — Winnipeg",
  description: "Live Winnipeg transit schedules with sub-minute accuracy.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-ink-950 text-ink-50 antialiased">
        <AmbientBackground />
        {children}
      </body>
    </html>
  );
}
