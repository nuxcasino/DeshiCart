import type { Context } from "hono";

/**
 * Shared zValidator hook: collapses Zod failures into our standard
 * `{ error, code }` contract instead of leaking raw Zod internals.
 */
export function validationHook(result: { success: boolean }, c: Context) {
  if (!result.success) {
    return c.json(
      { error: "Invalid input.", code: "VALIDATION_ERROR" },
      400
    );
  }
}
