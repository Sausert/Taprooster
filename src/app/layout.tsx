import type { Metadata, Viewport } from "next";
import { Exo_2, Space_Mono } from "next/font/google";
import "./globals.css";

const exo2 = Exo_2({
  subsets: ["latin"],
  variable: "--font-exo2",
  weight: ["300", "400", "600", "700", "900"],
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Taprooster — OJC Walhalla",
  description: "Het taprooster van OJC Walhalla, Sevenum",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Taprooster",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f0d1a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl" className={`${exo2.variable} ${spaceMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
