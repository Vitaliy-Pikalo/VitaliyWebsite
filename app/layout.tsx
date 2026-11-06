import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "@fontsource/cinzel/600.css";
import "@fontsource/cinzel/700.css";
import "./globals.css";

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
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
