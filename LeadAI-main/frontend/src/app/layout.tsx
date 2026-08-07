import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LeadAI — AI-Powered Lead Generation & Outreach",
  description: "Find, connect and convert high-quality business leads with AI-powered automation. Scan Google Maps, send cold emails, track replies, and close deals faster.",
  keywords: "lead generation, AI lead scoring, b2b leads, cold email, outreach automation, sales intelligence, google maps scraper",
  authors: [{ name: "LeadAI Team" }],
  creator: "LeadAI",
  openGraph: {
    title: "LeadAI — AI-Powered Lead Generation & Outreach",
    description: "Scan local businesses, generate AI outreach emails and close more deals.",
    type: "website",
    locale: "en_US",
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Inline SVG favicon — works without a file copy */}
        <link
          rel="icon"
          type="image/svg+xml"
          href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cdefs%3E%3ClinearGradient id='g1' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%237C3AED'/%3E%3Cstop offset='100%25' stop-color='%2314B8A6'/%3E%3C/linearGradient%3E%3ClinearGradient id='g2' x1='0' y1='1' x2='1' y2='0'%3E%3Cstop offset='0%25' stop-color='%237C3AED'/%3E%3Cstop offset='100%25' stop-color='%2314B8A6'/%3E%3C/linearGradient%3E%3C/defs%3E%3Cpath d='M22 14 C22 11 24 10 27 10 L33 10 C36 10 38 11 38 14 L38 72 C38 72 38 75 41 75 L76 75 C79 75 80 77 80 80 L80 86 C80 89 78 90 75 90 L27 90 C24 90 22 88 22 85 Z' fill='url(%23g1)'/%3E%3Cpath d='M50 62 C50 62 58 50 68 34 L62 34 L76 20 L76 34 L70 34 C70 34 58 54 52 66 Z' fill='url(%23g2)'/%3E%3Ccircle cx='44' cy='68' r='7' fill='%2314B8A6'/%3E%3Ccircle cx='44' cy='68' r='4' fill='white' fill-opacity='0.9'/%3E%3C/svg%3E"
        />
      </head>
      <body className="antialiased min-h-screen bg-customGray-light">
        {children}
      </body>
    </html>
  );
}
