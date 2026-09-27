import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata = {
  title: "Vibe Coding — Focus Music Player",
  description:
    "A calm, immersive music player for coding, focus, and relaxation.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0a0a0d",
};

import LockScreen from "@/components/LockScreen";

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="h-full min-h-screen bg-bg text-text-primary">
        <LockScreen>
          {children}
        </LockScreen>
      </body>
    </html>
  );
}
