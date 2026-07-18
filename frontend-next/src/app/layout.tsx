import type { ReactNode } from "react";

// Root layout passes through; the real shell (html/body) is [locale]/layout.
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
