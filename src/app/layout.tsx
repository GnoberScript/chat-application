import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chat Application",
  description: "By Gohan Rebong",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
