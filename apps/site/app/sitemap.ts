import { buildSitemapEntries } from "@florence/brain-core";
import { getBlogPosts } from "@/lib/brain";

export const baseUrl =
  process.env.NEXT_PUBLIC_BASE_URL || "https://chriscardoza.com";

export default async function sitemap() {
  return buildSitemapEntries(getBlogPosts(), baseUrl);
}
