import type { Metadata } from "next";
import { Geist, Geist_Mono, Cairo } from "next/font/google";
import "./globals.css";
import Navigation from "./components/Navigation";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "EduTech Egypt — AI-Powered Adaptive Learning",
  description:
    "An AI-powered education platform for Egyptian students and teachers. Adaptive quizzes, gamification, AI tutor, and full Arabic RTL support aligned with the Egyptian Ministry of Education curriculum.",
  keywords: [
    "education",
    "Egypt",
    "AI",
    "adaptive learning",
    "quiz",
    "Arabic",
    "edtech",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} ${cairo.variable}`} style={{ margin: 0 }}>
        <Navigation />
        {children}
      </body>
    </html>
  );
}
