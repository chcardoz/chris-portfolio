"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "home" },
  { href: "/blog", label: "writings" },
  { href: "/library", label: "library" },
];

export function Navbar() {
  const pathname = usePathname();
  if (pathname === "/") return null;

  return (
    <nav className="site-nav" aria-label="Main navigation">
      {links.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          aria-current={
            pathname === href ||
            (href !== "/" && pathname.startsWith(`${href}/`))
              ? "page"
              : undefined
          }
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
