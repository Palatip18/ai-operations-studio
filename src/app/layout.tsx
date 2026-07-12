import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Operations Studio | Personal Portfolio Prototype",
  description:
    "A privacy-safe AI implementation portfolio featuring tool calling, document retrieval, and workflow automation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
