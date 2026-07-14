import type { Metadata } from 'next';
import { Geist_Mono, Manrope } from 'next/font/google';
import { TooltipProvider } from '@tcground/ui';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';

const manrope = Manrope({
  variable: '--font-manrope-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'TCGround',
  description: 'TCG price tracking and community service',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='ko' className={`${manrope.variable} ${geistMono.variable} h-full antialiased`}>
      <body className='flex min-h-full flex-col'>
        <TooltipProvider>{children}</TooltipProvider>
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
