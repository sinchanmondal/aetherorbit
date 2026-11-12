import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Cormorant_Garamond, IBM_Plex_Sans } from 'next/font/google';
import './globals.css';

/**
 * Typography: Cormorant Garamond carries the star-atlas voice (headlines,
 * constellation names in italic); IBM Plex Sans handles interface text and
 * telemetry with tabular figures.
 */
const display = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-display',
  display: 'swap',
});

const sans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-sans',
  display: 'swap',
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'AetherOrbit — the sky over Vallichira, right now',
    template: '%s · AetherOrbit',
  },
  description:
    'Live satellites overhead, a nightly stargazing score, launches from NASA, ISRO, SpaceX and ESA, and AI explanations of the night sky — for Vallichira, Kerala.',
  applicationName: 'AetherOrbit',
  openGraph: {
    title: 'AetherOrbit',
    description: 'Live space intelligence for the sky over Vallichira, Kerala.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#07080D',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-IN" className={`${display.variable} ${sans.variable}`}>
      <body className="bg-void font-sans text-starlight antialiased">{children}</body>
    </html>
  );
}
