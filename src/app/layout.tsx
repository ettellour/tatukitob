import type { Metadata } from "next";
import { Manrope, Literata } from "next/font/google";
import "./globals.css";

// Премиальный современный шрифт для интерфейса (вместо приевшегося Inter)
const manrope = Manrope({
  variable: "--font-sans",
  subsets: ["latin", "cyrillic"],
});

// Профессиональный книжный шрифт (создан специально для Google Play Книг).
// Идеально одинаковая и сбалансированная кириллица и латиница.
const literata = Literata({
  variable: "--font-serif",
  subsets: ["latin", "cyrillic"],
  style: ['normal', 'italic'],
});

import { ThemeProvider } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "UniLibrary | Университетская Библиотека",
  description: "Академическая онлайн-библиотека для университетов Узбекистана",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="scroll-smooth" suppressHydrationWarning>
      <body className={`${manrope.variable} ${literata.variable} font-sans antialiased bg-[#FFFFFF] text-[#1A1A1A] dark:bg-[#001B36] dark:text-[#F8F9FA] transition-colors duration-200`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
