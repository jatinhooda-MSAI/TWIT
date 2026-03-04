import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TWIT | AI-Powered Tech News",
  description: "Stay ahead with AI-summarized tech news",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">{children}</body>
    </html>
  );
}
