import { drizzle as drizzleNeon, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import {
  drizzle as drizzlePg,
  type NodePgDatabase,
} from "drizzle-orm/node-postgres";
import { neon } from "@neondatabase/serverless";
import { Pool } from "pg";
import { setupResilientNeonFetch } from "./neon-fetch";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required (set it in .env)");
}

// Neon hosts (e.g. *.neon.tech) work best over HTTPS via @neondatabase/serverless,
// which avoids direct TCP on port 5432 (often blocked on serverless/edge runtimes).
const isNeon = databaseUrl.includes("neon.tech");

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

export const pool: Pool | undefined = isNeon
  ? undefined
  : (globalForDb.__arenaNextJsPostgresqlPool ??
    new Pool({
      connectionString: databaseUrl,
    }));

if (!isNeon && process.env.NODE_ENV !== "production" && pool) {
  globalForDb.__arenaNextJsPostgresqlPool = pool;
}

// Union of both drivers: they share the same query-builder surface used
// across the app (select/insert/execute), so call sites stay fully typed.
if (isNeon) {
  setupResilientNeonFetch();
}

export const db: NeonHttpDatabase | NodePgDatabase = isNeon
  ? drizzleNeon(neon(databaseUrl))
  : drizzlePg(pool as Pool);
