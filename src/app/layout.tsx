// app/layout.tsx
import "./globals.css";
import { Inter } from "next/font/google";
import { SupabaseProvider } from "@/components/supabase-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Legal Doc Analyzer",
  description: "Analyze legal documents with AI",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${inter.className} h-screen w-screen overflow-hidden bg-slate-950 text-amber-50`}
      >
        {/* Supabase provider for client-side auth */}
        <SupabaseProvider>{children}</SupabaseProvider>
      </body>
    </html>
  );
}
