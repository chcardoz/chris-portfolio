import Link from "next/link";

const navItems = {
  "/": {
    name: "home",
  },
  "/blog": {
    name: "posts",
  },
};

const externalItems = [
  { href: "https://github.com/chcardoz", name: "github" },
  { href: "https://x.com/keepaliveclub", name: "x" },
  {
    href: "https://www.linkedin.com/in/chris-cardoza-750987193/",
    name: "linkedin",
  },
];

export function Navbar() {
  return (
    <aside className="relative z-20 mb-12 tracking-tight text-sm">
      <div className="lg:sticky lg:top-20">
        <nav
          className="flex flex-row flex-wrap items-start gap-x-4 gap-y-2 relative px-0 pb-0 fade md:overflow-auto scroll-pr-6 md:relative"
          id="nav"
        >
          <div className="flex flex-row flex-wrap gap-x-4 gap-y-2 group">
            {Object.entries(navItems).map(([path, { name }]) => {
              return (
                <Link
                  key={path}
                  href={path}
                  className="transition-colors duration-150 text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-neutral-100"
                >
                  {name}
                </Link>
              );
            })}
            {externalItems.map(({ href, name }) => (
              <a
                key={href}
                href={href}
                rel="noopener noreferrer"
                target="_blank"
                className="transition-colors duration-150 text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-neutral-100"
              >
                {name}
              </a>
            ))}
          </div>
        </nav>
      </div>
    </aside>
  );
}
