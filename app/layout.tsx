import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ShramSetu AI — Digital identity for India's informal workforce",
  description:
    "ShramSetu AI is a digital identity, jobs, trust, and financial empowerment platform for India's informal workforce.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
