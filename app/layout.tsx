import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-jakarta', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono-jakarta', display: 'swap' });

export const metadata: Metadata = {
  title: 'Absensi Piket Penetasan | TNK 62',
  description:
    'Sistem absensi piket fasilitas penetasan: pilih shift, ambil foto kondisi, kirim laporan kehadiran ke sheet piket.',
  applicationName: 'Absensi Penetasan',
  keywords: ['absensi', 'piket', 'penetasan', 'egg', 'TNK 62', 'sains'],
  authors: [{ name: 'TNK 62' }],
  openGraph: {
    title: 'Absensi Piket Penetasan | TNK 62',
    description: 'Catat kehadiran piket fasilitas penetasan dengan foto langsung.',
    type: 'website',
    locale: 'id_ID',
  },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#071a2e',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${inter.variable} ${jakarta.variable} ${mono.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
