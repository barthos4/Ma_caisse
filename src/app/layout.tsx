import type { Metadata } from 'next';
import { Inter } from 'next/font/google'; // Using Inter as a clean sans-serif font
import './globals.css';
import { MainLayout } from '@/components/layout/main-layout';
import { Toaster } from "@/components/ui/toaster";
import { fr } from 'date-fns/locale'; // Import French locale for date-fns if needed globally, or import in specific components

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans', // Using --font-sans as it's common with Tailwind
});

export const metadata: Metadata = {
  title: 'BudgetBaguette',
  description: 'Votre guide personnel pour le bien-être financier.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <MainLayout>{children}</MainLayout>
        <Toaster />
      </body>
    </html>
  );
}
