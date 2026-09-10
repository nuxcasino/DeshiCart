# SEO Checklist (recurring)

Run through this after content/schema changes and before big campaigns.

- [ ] `GET /sitemap.xml` returns 200 and includes new products/categories in
      both locales.
- [ ] `GET /robots.txt` still blocks `/admin/`, `/api/`, checkout, account,
      order, auth paths.
- [ ] A sample product page contains exactly one canonical (BN URL) and
      `hreflang` bn/en/x-default (view source, search `hreflang`).
- [ ] Product JSON-LD validates (Google Rich Results Test): price, currency
      BDT, availability matches live stock, no `aggregateRating` on
      zero-review products.
- [ ] Noindex-worthy pages stay out: place a test order URL, `/account`,
      `/admin/*` return 404/redirect (never 200 with indexable content).
- [ ] New public pages added to `STATIC_PATHS` in `src/app/sitemap.ts` and to
      the footer.
- [ ] Images have meaningful `alt` (product name / variant combo), admin alt
      text filled for new uploads.
- [ ] `metadataBase`/`SITE_URL` matches the production domain after a domain
      change (else canonicals + OG URLs go stale).
- [ ] Lighthouse SEO ≥ 90 on `/bn` and one product page (mobile).
