import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "BehoerdenBuddy",
    template: "%s | BehoerdenBuddy",
  },
  description:
    "Behoerdenpost verstehen und organisieren: Fristen, Aufgaben und Vorgaenge an einem Ort.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
