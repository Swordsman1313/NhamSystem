import type { Metadata, Viewport } from 'next';
import { Kantumruy_Pro } from 'next/font/google';
import './globals.css';
import Navigation from '@/components/Navigation';

const kantumruy = Kantumruy_Pro({
  subsets: ['khmer', 'latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-kantumruy',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Nham Nham Ops - B2B Fresh Fruit Operating System',
  description:
    'Dedicated Operating System for Nham Nham B2B Fresh Fruit Distribution: Delivery Notes, Commercial Invoices, Batch-Yield Costing, and Store Reconciliation Statements.',
  keywords: ['Nham Nham', 'Fresh Fruit', 'B2B Cambodia', 'Invoicing', 'Batch Yield Costing', 'Delivery Note'],
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: { children: React.ReactNode }) {
  return (
    <html lang="km" className={`${kantumruy.variable} font-sans`}>
      <head>
        <link rel="icon" href="/logo.png" type="image/png" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.addEventListener('beforeprint', function() {
                window.__origTitle = document.title;
                document.title = '';
              });
              window.addEventListener('afterprint', function() {
                if (window.__origTitle) document.title = window.__origTitle;
              });
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-slate-50/60 text-slate-900 antialiased flex flex-col md:flex-row">
        <Navigation />
        <div className="flex-1 min-w-0 md:pl-64 lg:pl-72 flex flex-col min-h-screen">
          <main className="flex-1 w-full pb-16">{children}</main>
        </div>
      </body>
    </html>
  );
}

type ReadencodedLayoutProps<T> = T;
