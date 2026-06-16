import type { BlogPost } from "./types";

export function getVisibleBlogPosts(
  posts: BlogPost[],
  includeDrafts = false,
): BlogPost[] {
  return sortBlogPosts(
    includeDrafts ? posts : posts.filter((post) => !post.metadata.draft),
  );
}

export function sortBlogPosts(posts: BlogPost[]): BlogPost[] {
  return [...posts].sort(
    (a, b) =>
      new Date(b.metadata.publishedAt).getTime() -
      new Date(a.metadata.publishedAt).getTime(),
  );
}
