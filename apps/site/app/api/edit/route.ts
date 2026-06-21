import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { readRawBlogPost, writeRawBlogPost } from "@/lib/brain";

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug) {
    return NextResponse.json({ error: "Missing slug" }, { status: 400 });
  }

  const safeName = path.basename(slug);

  try {
    return NextResponse.json({ content: readRawBlogPost(safeName) });
  } catch {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }
}

export async function PUT(req: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { slug?: unknown; content?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { slug, content } = body;
  if (typeof slug !== "string" || !slug || typeof content !== "string") {
    return NextResponse.json(
      { error: "Missing slug or content" },
      { status: 400 },
    );
  }

  const safeName = path.basename(slug);

  try {
    writeRawBlogPost(safeName, content);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to write file" },
      { status: 500 },
    );
  }
}
