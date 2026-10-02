import type { Metadata } from "next";
import { Cormorant_Garamond, Geist } from "next/font/google";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "International Casino Tirana",
  description: "Luxury casino landing page for International Casino Tirana.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${geistSans.variable} antialiased`}
    >
      <body>{children}</body>
    </html>
  );
}
