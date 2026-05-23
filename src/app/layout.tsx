import type { Metadata } from "next";
import { Outfit, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MIT Result Fetcher",
  description: "Fetch and analyze results for MIT Muzaffarpur",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${outfit.variable} ${plusJakartaSans.variable} font-sans antialiased`}
        style={{ fontFamily: 'var(--font-plus-jakarta-sans), system-ui, sans-serif' }}
      >
        {children}
      </body>
    </html>
  );
}
