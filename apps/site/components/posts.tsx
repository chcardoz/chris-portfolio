import Link from "next/link";
import { formatDate, getVisibleBlogPosts } from "@cbrain/core";
import { getBlogPosts } from "@/lib/brain";

const isDev = process.env.NODE_ENV === "development";

export function BlogPosts({ limit }: { limit?: number } = {}) {
  const sorted = getVisibleBlogPosts(getBlogPosts(), isDev);
  const posts = limit ? sorted.slice(0, limit) : sorted;

  return (
    <div>
      {posts.map((post) => (
        <Link
          key={post.slug}
          className="flex flex-col space-y-1 mb-4"
          href={`/blog/${post.slug}`}
        >
          <div className="w-full flex flex-col md:flex-row space-x-0 md:space-x-2">
            <p className="text-neutral-600 dark:text-neutral-400 w-[100px] tabular-nums">
              {formatDate(post.metadata.publishedAt, false)}
            </p>
            {post.metadata.draft ? (
              <span className="text-yellow-600 dark:text-yellow-400 tracking-tight font-medium">
                {post.metadata.title} (Draft)
              </span>
            ) : (
              <p className="text-neutral-900 dark:text-neutral-100 tracking-tight">
                {post.metadata.title}
              </p>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
