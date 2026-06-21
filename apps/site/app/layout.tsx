import "./global.css";
import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import { Navbar } from "@/components/nav";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Footer from "@/components/footer";
import { baseUrl } from "./sitemap";
import { AmbientNoise } from "@/components/ambient-noise";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

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

const cx = (...classes) => classes.filter(Boolean).join(" ");

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={cx(
        "text-black bg-white dark:text-white dark:bg-black",
        spaceGrotesk.variable,
      )}
    >
      <body className="antialiased max-w-xl mx-4 mt-8 lg:mx-auto">
        <div className="page-blur" aria-hidden="true" />
        <AmbientNoise />
        <main className="flex-auto min-w-0 mt-6 flex flex-col px-2 md:px-0 isolate">
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
