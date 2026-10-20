import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "TYACDI BRIDGE — Ambition meets experience",
  description: "A trusted professional network connecting ambitious builders with experienced leaders."
};
export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) {
  return <html lang="en"><body>{children}</body></html>;
}
