import { NextResponse } from "next/server";

// Minimal in-memory sliding-window rate limiter for abuse-prone endpoints.
// Note: on serverless each instance tracks its own counters, so this is a
// first layer (slows casual abuse / brute force), not a distributed guarantee.
// For strict global limits later, back this with Upstash Redis or similar.

const buckets = new Map<string, number[]>();

function prune() {
  if (buckets.size < 5000) return;
  const now = Date.now();
  for (const [key, hits] of buckets) {
    const fresh = hits.filter((t) => now - t < 60_000);
    if (fresh.length === 0) buckets.delete(key);
    else buckets.set(key, fresh);
  }
}

export function clientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

/** Returns true when the key exceeded `limit` hits in the last `windowMs`. */
export function isRateLimited(
  key: string,
  limit: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return true;
  }
  hits.push(now);
  buckets.set(key, hits);
  prune();
  return false;
}

export function rateLimitedResponse(): NextResponse {
  return NextResponse.json(
    { error: "Too many requests. Please try again shortly." },
    { status: 429 }
  );
}
