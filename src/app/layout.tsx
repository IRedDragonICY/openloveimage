import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ThemeProvider from "./components/ThemeProvider";
import { SettingsProvider } from "./components/SettingsContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "OpenLoveImage - Free Online Image Converter | HEIC to JPG, PNG & More",
    template: "%s | OpenLoveImage"
  },
  description: "Free online image converter supporting HEIC to JPG, PNG, WebP, GIF, BMP, TIFF, SVG. Fast, secure, and no upload required. Convert multiple images with batch processing in your browser.",
  keywords: [
    "image converter",
    "HEIC to JPG",
    "PNG converter", 
    "WebP converter",
    "online image tools",
    "batch conversion",
    "free image converter",
    "image format converter",
    "HEIC converter",
    "JPG to PNG",
    "image optimization",
    "photo converter",
    "picture converter",
    "convert images online",
    "image transformation"
  ].join(", "),
  authors: [{ name: "OpenLoveImage Team", url: "https://github.com/ireddragonicy/openloveimage" }],
  creator: "OpenLoveImage",
  publisher: "OpenLoveImage",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://openloveimage.com',
    siteName: 'OpenLoveImage',
    title: 'OpenLoveImage - Free Online Image Converter',
    description: 'Convert HEIC to JPG, PNG, WebP and more formats instantly. Free, secure, and works entirely in your browser. No upload required.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'OpenLoveImage - Free Online Image Converter',
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OpenLoveImage - Free Online Image Converter',
    description: 'Convert HEIC to JPG, PNG, WebP and more formats instantly. Free, secure, and works entirely in your browser.',
    images: ['/og-image.png'],
    creator: '@openloveimage',
  },
  alternates: {
    canonical: 'https://openloveimage.com',
  },
  category: 'Technology',
  classification: 'Image Converter Tool',
  other: {
    'google-site-verification': 'your-google-site-verification-code',
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1976d2",
  colorScheme: "light dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'OpenLoveImage',
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Any',
    description: 'Free online image converter supporting multiple formats including HEIC to JPG, PNG, WebP, and more.',
    url: 'https://openloveimage.com',
    author: {
      '@type': 'Organization',
      name: 'OpenLoveImage Team',
    },
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    featureList: [
      'HEIC to JPG conversion',
      'PNG format support', 
      'WebP conversion',
      'Batch processing',
      'No upload required',
      'Privacy focused',
      'Free to use'
    ],
  };

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <link rel="canonical" href="https://openloveimage.com" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="google-site-verification" content="your-google-site-verification-code" />
        <meta name="msvalidate.01" content="your-bing-verification-code" />
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icon-192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SettingsProvider>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </SettingsProvider>
      </body>
    </html>
  );
}
