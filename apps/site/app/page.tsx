import { BlogPosts } from "@/components/posts";
import { baseUrl } from "@/app/sitemap";

const personSchema = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Chris Cardoza",
  url: baseUrl,
  image: `${baseUrl}/profile-pic.png`,
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
    <section className="stagger-scope">
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }}
      />
      <div className="mb-10 space-y-8">
        <div className="space-y-3">
          <h1
            className="stagger-in text-2xl font-semibold"
            style={{ animationDelay: "0ms" }}
          >
            Chris Cardoza
          </h1>
          <p
            className="stagger-in text-neutral-700 dark:text-neutral-300 leading-relaxed max-w-[38rem]"
            style={{ animationDelay: "150ms" }}
          >
            I am interested in how to make the future real.
          </p>
          <p
            className="stagger-in text-neutral-700 dark:text-neutral-300 leading-relaxed max-w-[38rem]"
            style={{ animationDelay: "300ms" }}
          >
            I am also interested in creating better abstractions for human
            beings.
          </p>
          <p
            className="stagger-in text-neutral-700 dark:text-neutral-300 leading-relaxed max-w-[38rem]"
            style={{ animationDelay: "450ms" }}
          >
            My background spans art, physics, and performance.
          </p>
        </div>
        <hr
          className="stagger-in border-neutral-300 dark:border-neutral-800"
          style={{ animationDelay: "600ms" }}
        />
        <div className="stagger-in" style={{ animationDelay: "750ms" }}>
          <BlogPosts limit={3} />
        </div>
      </div>
    </section>
  );
}
