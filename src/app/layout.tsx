import './globals.css';
import { Inter } from 'next/font/google';
import { SupabaseProvider } from '../components/supabase-provider'; // Create this

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Legal Doc Analyzer',
  description: 'Analyze legal documents with AI',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SupabaseProvider>{children}</SupabaseProvider>
      </body>
    </html>
  );
}