import { NextResponse } from "next/server";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { getAdminFromRequest } from "@/lib/admin";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function POST(request: Request) {
  const admin = await getAdminFromRequest(request);
  if (!admin) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  try {
    const data = await request.json();
    const name = String(data.name ?? "").trim().slice(0, 80);
    const slug = slugify(String(data.slug || data.name || "")).slice(0, 80);
    if (!name || !slug) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }
    const [row] = await db
      .insert(categories)
      .values({
        name,
        slug,
        tagline: String(data.tagline ?? "").trim().slice(0, 160),
        image: String(data.image ?? "").trim().slice(0, 500),
      })
      .returning();
    return NextResponse.json({ category: row }, { status: 201 });
  } catch (e) {
    if (e instanceof Error && /unique|duplicate/i.test(e.message)) {
      return NextResponse.json({ error: "Slug already exists." }, { status: 409 });
    }
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
