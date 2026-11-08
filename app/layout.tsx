import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource/cinzel/600.css";
import "@fontsource/cinzel/700.css";
import "./globals.css";

const description =
  "Computer engineering student at Penn State building AI products, ML systems, and full-stack apps.";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.vitaliypikalo.com"),
  title: "Vitaliy Pikalo",
  description,
  openGraph: {
    title: "Vitaliy Pikalo",
    description,
    url: "https://www.vitaliypikalo.com",
    siteName: "Vitaliy Pikalo",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Vitaliy Pikalo",
    description,
  },
};

export const viewport: Viewport = {
  themeColor: "#1c2230",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
