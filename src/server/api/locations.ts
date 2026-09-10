import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "@/db";
import { districts, divisions } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { getDistricts, getDivisions, getUpazilas } from "@/lib/locations";
import { NotFoundError } from "../errors";
import { validationHook } from "../validate";

const app = new Hono()
  .get("/divisions", async (c) => {
    return c.json({ divisions: await getDivisions() });
  })
  .get("/divisions/:divisionId/districts", async (c) => {
    return c.json({ districts: await getDistricts(c.req.param("divisionId")) });
  })
  .get("/districts/:districtId/upazilas", async (c) => {
    return c.json({ upazilas: await getUpazilas(c.req.param("districtId")) });
  })
  .get(
    "/resolve",
    zValidator(
      "query",
      z.object({ district: z.string().trim().min(1).max(60) }),
      validationHook
    ),
    async (c) => {
      // Matches a legacy city name (e.g. from a saved address) to its
      // division/district/upazilas for checkout prefill.
      const name = c.req.valid("query").district;
      const [district] = await db
        .select()
        .from(districts)
        .where(sql`lower(${districts.nameEn}) = lower(${name})`);
      if (!district) throw new NotFoundError("District not found.");
      const [division] = await db
        .select()
        .from(divisions)
        .where(eq(divisions.id, district.divisionId));
      return c.json({
        division,
        district,
        upazilas: await getUpazilas(district.id),
      });
    }
  );

export type LocationsRoute = typeof app;
export default app;
