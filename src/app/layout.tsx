import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Quant Trader Lite — Evidence-Based Market Decision Engine',
  description: 'Lightweight AI-assisted quantitative trading and paper-trading engine designed for Vercel deployment (<500 MB footprint target).',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#080C14] text-gray-100 antialiased selection:bg-blue-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
