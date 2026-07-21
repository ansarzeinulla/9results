import type { Metadata } from "next";
import type { ReactNode } from "react";
import PwaRegister from "@/components/PwaRegister";
import "./globals.css";

export const metadata: Metadata = {
  title: "results.togyz",
  description: "Togyzkumalak tournament results and player ratings",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className="min-h-screen bg-white text-neutral-900 antialiased">
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
