import { sortBlogPosts } from "./blog";
import type { BlogPost } from "./types";

export type FeedItem = {
  title: string;
  url: string;
  description: string;
  publishedAt: string;
};

export type SitemapEntry = {
  url: string;
  lastModified: string;
};

export function buildBlogFeedItems(
  posts: BlogPost[],
  baseUrl: string,
): FeedItem[] {
  return sortBlogPosts(posts.filter((post) => !post.metadata.draft)).map(
    (post) => ({
      title: post.metadata.title,
      url: `${baseUrl}/blog/${post.slug}`,
      description: post.metadata.summary,
      publishedAt: post.metadata.publishedAt,
    }),
  );
}

export function buildSitemapEntries(
  posts: BlogPost[],
  baseUrl: string,
  generatedAt = new Date(),
): SitemapEntry[] {
  const routes = ["", "/blog"].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: generatedAt.toISOString().split("T")[0] ?? "",
  }));

  const blogRoutes = posts
    .filter((post) => !post.metadata.draft)
    .map((post) => ({
      url: `${baseUrl}/blog/${post.slug}`,
      lastModified: post.metadata.publishedAt,
    }));

  return [...routes, ...blogRoutes];
}
