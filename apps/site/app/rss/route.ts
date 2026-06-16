import { baseUrl } from "@/app/sitemap";
import { buildBlogFeedItems } from "@florence/brain-core";
import { getBlogPosts } from "@/lib/brain";

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const itemsXml = buildBlogFeedItems(getBlogPosts(), baseUrl)
    .map(
      (item) =>
        `<item>
          <title>${escapeXml(item.title)}</title>
          <link>${item.url}</link>
          <description>${escapeXml(item.description)}</description>
          <pubDate>${new Date(item.publishedAt).toUTCString()}</pubDate>
        </item>`,
    )
    .join("\n");

  const rssFeed = `<?xml version="1.0" encoding="UTF-8" ?>
  <rss version="2.0">
    <channel>
        <title>Chris Cardoza</title>
        <link>${baseUrl}</link>
        <description>Chris Cardoza's blog and portfolio</description>
        ${itemsXml}
    </channel>
  </rss>`;

  return new Response(rssFeed, {
    headers: {
      "Content-Type": "text/xml",
    },
  });
}
