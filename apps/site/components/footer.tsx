import Link from "next/link";

export default function Footer() {
  // oxlint-disable-next-line react/purity -- This Server Component computes the year during server rendering.
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <span>© {year} Chris Cardoza</span>
      <Link href="/rss" prefetch={false}>
        rss
      </Link>
    </footer>
  );
}
