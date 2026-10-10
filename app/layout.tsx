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
  title: {
    default: 'Dashboard | Nham Nham Ops',
    template: '%s | Nham Nham Ops',
  },
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
  viewportFit: 'cover',
};

import { ThemeProvider } from '@/components/ThemeProvider';

export default function RootLayout({
  children,
}: { children: React.ReactNode }) {
  return (
    <html lang="km" suppressHydrationWarning className={`${kantumruy.variable} font-sans`}>
      <head>
        <link rel="icon" href="/logo.png" type="image/png" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('nham_theme');
                  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  if (saved === 'dark' || (!saved && prefersDark)) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch(e) {}
              })();
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
      <body className="min-h-[100dvh] bg-slate-50/60 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased flex flex-col md:flex-row transition-colors duration-200">
        <ThemeProvider>
          <Navigation />
          <div className="flex-1 min-w-0 md:pl-64 flex flex-col min-h-[100dvh]">
            <main className="flex-1 w-full pb-6 md:pb-16">{children}</main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}

type ReadencodedLayoutProps<T> = T;
