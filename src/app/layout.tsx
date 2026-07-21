import type { Metadata, Viewport } from 'next';
import { Playfair_Display, Poppins } from 'next/font/google';
import { cache } from 'react';
import { Providers } from '@/components/providers';
import { StorefrontChrome } from '@/components/layout/storefront-chrome';
import { StoreSettingsProvider } from '@/components/store-settings-provider';
import { serverStore } from '@/lib/server-store';
import { API_ORIGIN, SITE_URL } from '@/lib/api-origin';
import { organizationJsonLd } from '@/lib/json-ld';
import type { PublicSettings } from '@/types';
import './globals.css';

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '600'],
  variable: '--font-playfair',
  display: 'swap',
  adjustFontFallback: true,
  fallback: ['Georgia', 'serif'],
});

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-poppins',
  display: 'swap',
  adjustFontFallback: true,
  fallback: ['Arial', 'Helvetica', 'sans-serif'],
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

const getLayoutSettings = cache(async (): Promise<PublicSettings> => {
  try {
    return await serverStore.getSettings();
  } catch {
    return {};
  }
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Singari Sarees | Where Every Weave Tells a Story',
    template: '%s | Singari Sarees',
  },
  description:
    'Discover exquisite handcrafted sarees at Singari Sarees. Authentic weaves, pure tradition, timeless elegance.',
  keywords: ['sarees', 'silk sarees', 'banarasi', 'kanjivaram', 'handloom', 'indian sarees'],
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    siteName: 'Singari Sarees',
    title: 'Singari Sarees | Where Every Weave Tells a Story',
    description: 'Authentic weaves. Pure tradition. Timeless elegance.',
    images: [{ url: '/logo.png', width: 512, height: 512, alt: 'Singari Sarees' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Singari Sarees',
    description: 'Authentic weaves. Pure tradition. Timeless elegance.',
    images: ['/logo.png'],
  },
  robots: { index: true, follow: true },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await getLayoutSettings();
  const orgLd = organizationJsonLd();

  return (
    <html lang="en" className={`${playfair.variable} ${poppins.variable} ${poppins.className}`}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#ffffff" />
        <link rel="preconnect" href={API_ORIGIN} />
        <link rel="dns-prefetch" href={API_ORIGIN} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLd) }}
        />
      </head>
      <body className="min-h-screen bg-cream font-sans antialiased">
        <StoreSettingsProvider settings={settings}>
          <Providers>
            <StorefrontChrome>{children}</StorefrontChrome>
          </Providers>
        </StoreSettingsProvider>
      </body>
    </html>
  );
}
