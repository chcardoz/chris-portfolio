import Link from "next/link";
import { baseUrl } from "@/app/sitemap";

const personSchema = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Chris Cardoza",
  url: baseUrl,
  jobTitle: "Founder",
  description:
    "Founder interested in making the future real and building better abstractions for human beings.",
  sameAs: [
    "https://github.com/chcardoz",
    "https://x.com/keepaliveclub",
    "https://www.linkedin.com/in/chris-cardoza-750987193/",
  ],
};

export default function Page() {
  return (
    <section className="home-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }}
      />
      <h1>Chris Cardoza</h1>
      <div className="home-intro">
        <p>I am interested in how to make the future real.</p>
        <p>
          I am also interested in creating better abstractions for human beings.
          My background spans art, physics, and performance.
        </p>
      </div>
      <nav aria-label="Explore" className="home-links">
        <Link href="/library">my library</Link>
        <Link href="/blog">writings</Link>
        <a
          href="https://github.com/chcardoz"
          target="_blank"
          rel="noopener noreferrer"
        >
          github
        </a>
        <a
          href="https://x.com/keepaliveclub"
          target="_blank"
          rel="noopener noreferrer"
        >
          twitter
        </a>
        <a
          href="https://www.linkedin.com/in/chris-cardoza-750987193/"
          target="_blank"
          rel="noopener noreferrer"
        >
          linkedin
        </a>
      </nav>
    </section>
  );
}
