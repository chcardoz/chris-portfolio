import { notFound } from "next/navigation";
import { CustomMDX } from "@/components/mdx";
import { formatDate } from "@cbrain/core";
import { getBlogPosts } from "@/lib/brain";
import { baseUrl } from "@/app/sitemap";

const isDev = process.env.NODE_ENV === "development";

export async function generateStaticParams() {
  let posts = getBlogPosts();

  // Don't generate static pages for drafts in production
  return posts
    .filter((post) => isDev || !post.metadata.draft)
    .map((post) => ({
      slug: post.slug,
    }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  let post = getBlogPosts().find((post) => post.slug === slug);
  if (!post) {
    return;
  }

  let {
    title,
    publishedAt: publishedTime,
    summary: description,
    image,
  } = post.metadata;
  let ogImage = image
    ? image
    : `${baseUrl}/og?title=${encodeURIComponent(title)}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      publishedTime,
      url: `${baseUrl}/blog/${slug}`,
      images: [
        {
          url: ogImage,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function Blog({ params }: Props) {
  const { slug } = await params;
  let post = getBlogPosts().find((post) => post.slug === slug);

  if (!post) {
    notFound();
  }

  // In production, drafts should 404
  if (!isDev && post.metadata.draft) {
    notFound();
  }

  return (
    <section className="stagger-scope">
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: post.metadata.title,
            datePublished: post.metadata.publishedAt,
            dateModified: post.metadata.publishedAt,
            description: post.metadata.summary,
            image: post.metadata.image
              ? `${baseUrl}${post.metadata.image}`
              : `${baseUrl}/og?title=${encodeURIComponent(post.metadata.title)}`,
            url: `${baseUrl}/blog/${slug}`,
            author: {
              "@type": "Person",
              name: "Chris Cardoza",
            },
          }),
        }}
      />
      <h1 className="stagger-in title font-semibold text-3xl leading-tight">
        {post.metadata.title}
      </h1>
      <div
        className="stagger-in flex justify-between items-center mt-3 mb-10 text-sm"
        style={{ animationDelay: "150ms" }}
      >
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          {formatDate(post.metadata.publishedAt)}
          {post.metadata.draft && (
            <span className="ml-2 text-yellow-600 dark:text-yellow-400">
              · Draft
            </span>
          )}
        </p>
      </div>
      <article className="stagger-in prose" style={{ animationDelay: "300ms" }}>
        <CustomMDX source={post.content} />
      </article>
    </section>
  );
}
