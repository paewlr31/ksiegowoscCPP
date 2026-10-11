import type { Metadata } from "next";
import "./globals.css";
import { Shell } from "@/components/Shell";

export const metadata: Metadata = {
  title: "Księgowość",
  description: "Faktury, VAT i CIT dla jednej spółki",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,520;9..144,650&family=Outfit:wght@380;500;650&display=swap" rel="stylesheet" />
      </head>
      <body className="font-sans text-atrament antialiased">
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
