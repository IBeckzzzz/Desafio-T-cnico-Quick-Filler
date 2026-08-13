import type { Metadata } from "next";
import "./globals.css";

import ThemeRegistry from "@/components/providers/ThemeRegistry";

export const metadata: Metadata = {
  title: "Quick Filler",
  description: "Desafio Técnico",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <ThemeRegistry>
          {children}
        </ThemeRegistry>
      </body>
    </html>
  );
}