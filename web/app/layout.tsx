import type { Metadata } from "next";
import "./globals.css";
import "leaflet/dist/leaflet.css";

export const metadata: Metadata = {
  title: "Transit — Winnipeg",
  description: "Live Winnipeg transit schedules. AI-ready.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-theme-default">
        <div className="min-h-screen bg-gradient-to-br from-indigo-900/60 via-purple-900/40 to-blue-900/40">
          {children}
        </div>
      </body>
    </html>
  );
}
