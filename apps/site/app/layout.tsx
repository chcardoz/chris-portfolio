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

const cx = (...classes) => classes.filter(Boolean).join(" ");

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cx(
        "text-neutral-950 bg-[#f8f7f2] dark:text-[#ece8df] dark:bg-[#11110f]",
      )}
    >
      <body className="antialiased min-w-[360px]">
        <div className="page-blur" aria-hidden="true" />
        <main className="flex-auto min-w-0 flex w-full max-w-[44rem] flex-col px-5 pt-10 md:px-10 lg:ml-20 xl:ml-28 2xl:ml-36">
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
