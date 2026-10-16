import "./global.css";
import type { Metadata } from "next";
import { Navbar } from "@/components/nav";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Footer from "@/components/footer";
import { baseUrl } from "./sitemap";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "Chris Cardoza",
    template: "%s | Chris Cardoza",
  },
  description:
    "Founder interested in making the future real and building better abstractions for human beings. Background in art, physics, and performance.",
  openGraph: {
    title: "Chris Cardoza",
    description:
      "Founder interested in making the future real and building better abstractions for human beings. Background in art, physics, and performance.",
    url: baseUrl,
    siteName: "Chris Cardoza",
    locale: "en_US",
    type: "website",
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
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">
        <main className="site-shell">
          <Navbar />
          {children}
          <Footer />
          <Analytics />
          <SpeedInsights />
        </main>
      </body>
    </html>
  );
}
