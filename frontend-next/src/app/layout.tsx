import type { Metadata } from "next";
import type { ReactNode } from "react";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "results.togyz",
  description: "Togyzkumalak tournament results and player ratings",
};

// html/body live here so the beforeInteractive theme script sits in the root
// layout (required by next/script) and never re-renders on locale switch.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className="min-h-screen bg-white text-neutral-900 antialiased dark:bg-neutral-950 dark:text-neutral-100">
        <Script id="theme-init" strategy="beforeInteractive">
          {`try{if(localStorage.theme==='dark'||(!localStorage.theme&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}`}
        </Script>
        {children}
      </body>
    </html>
  );
}
