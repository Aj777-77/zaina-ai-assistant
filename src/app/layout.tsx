import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Zaina AI Assistant",
  description: "Zaina is a friendly and helpful AI shopping assistant for Zain Bahrain's e-commerce store. She helps customers find phones, tablets, laptops, smartwatches, accessories, vouchers, gift cards, home solutions, gaming products, and plans from Zain Bahrain. Zaina provides product recommendations based on customer needs and budget, answers questions about devices, specifications, and plans, and is conversational, friendly, and enthusiastic about technology. She always mentions prices in Bahraini Dinars (BD).",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
