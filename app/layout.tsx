import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Vitaliy Pikalo | Computer Engineering Student • Builder • Competitor",
  description: "Computer Engineering student at Penn State and collegiate tennis player building high-performance software, systems, and products.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${inter.variable} ${spaceGrotesk.variable} antialiased`}>
        {/* Netflix-style film grain overlay */}
        <div className="grain-overlay" aria-hidden />
        {children}
      </body>
    </html>
  );
}
