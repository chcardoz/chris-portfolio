import Link from "next/link";
import { formatDate, getVisibleBlogPosts } from "@cbrain/core";
import { getBlogPosts } from "@/lib/brain";

const isDev = process.env.NODE_ENV === "development";

export function BlogPosts() {
  const posts = getVisibleBlogPosts(getBlogPosts(), isDev);

  if (posts.length === 0) {
    return <p className="muted">More writing soon.</p>;
  }

  return (
    <ul className="writing-list">
      {posts.map((post) => (
        <li key={post.slug}>
          <Link href={`/blog/${post.slug}`} className="writing-link">
            <span className="writing-title">{post.metadata.title}</span>
            <span className="writing-date">
              {post.metadata.draft
                ? "in progress"
                : formatDate(post.metadata.publishedAt)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
