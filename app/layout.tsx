import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Sans, Instrument_Serif } from "next/font/google";
import "./globals.css";

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  weight: "400",
  subsets: ["latin"],
  style: "italic",
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

//hi

export const metadata: Metadata = {
  title: {
    default: "Access AI - Automated Accessibility Testing",
    template: "%s | Access AI",
  },
  description: "Automated accessibility testing and auditing tool powered by AI. Test your websites for WCAG compliance, generate sitemaps, and create accessibility reports with ease.",
  keywords: ["accessibility", "a11y", "WCAG", "web accessibility", "automated testing", "AI testing", "accessibility audit"],
  authors: [{ name: "Access AI" }],
  creator: "Access AI",
  publisher: "Access AI",
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || "https://accessibility-agent.vercel.app"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "Access AI",
    title: "Access AI - Automated Accessibility Testing",
    description: "Automated accessibility testing and auditing tool powered by AI. Test your websites for WCAG compliance, generate sitemaps, and create accessibility reports.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Access AI - Automated Accessibility Testing",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Access AI - Automated Accessibility Testing",
    description: "Automated accessibility testing and auditing tool powered by AI. Test your websites for WCAG compliance and generate accessibility reports.",
    images: ["/og-image.jpg"],
    creator: "@accessai",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      {
        rel: "mask-icon",
        url: "/safari-pinned-tab.svg",
        color: "#000000",
      },
    ],
  },
  manifest: "/site.webmanifest",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${instrumentSans.variable} ${instrumentSerif.variable} ${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
