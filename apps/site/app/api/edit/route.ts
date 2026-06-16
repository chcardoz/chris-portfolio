import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug) {
    return NextResponse.json({ error: "Missing slug" }, { status: 400 });
  }

  const safeName = path.basename(slug);
  const filePath = path.resolve(
    process.cwd(),
    "..",
    "..",
    "posts",
    `${safeName}.mdx`,
  );

  try {
    const content = await fs.readFile(filePath, "utf-8");
    return NextResponse.json({ content });
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
  const filePath = path.resolve(
    process.cwd(),
    "..",
    "..",
    "posts",
    `${safeName}.mdx`,
  );

  try {
    await fs.writeFile(filePath, content, "utf-8");
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to write file" },
      { status: 500 },
    );
  }
}
