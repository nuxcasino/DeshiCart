import app from "@/server/api";

// Serves every /api/* path that no legacy route file claims. Migrated domains
// (health, categories, products, reviews) are handled by Hono; remaining
// legacy route.ts files keep working until their migration lands.
function handle(request: Request) {
  return app.fetch(request);
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
