# AI Search / GEO Notes

How DeshiCart stays answerable by ChatGPT, Gemini, Claude, Perplexity, and
Google AI experiences — and what not to do.

## What we implement

- **Factual, structured content:** real FAQ answers, measured size tables,
  live shipping fees, and a written returns policy give answer engines
  quotable facts with clear provenance (DeshiCart, Dhaka, BDT).
- **Machine-readable commerce data:** JSON-LD Product/Offer/Review/Breadcrumb
  on every product page; locale-tagged (`bn` primary) so Bangla answers can
  cite us.
- **Stable URLs:** product slugs never change; if a URL must move, add a
  redirect and update canonical + sitemap (see `docs/architecture.md` §61 rule).

## What we never do

- No fake reviews/ratings/statistics, no keyword stuffing, no cloaking, no
  AI-spam doorway pages, no fake authority claims ("#1 store in Bangladesh").
- No `aggregateRating` without genuine reviews — a single fabricated rating
  poisons trust with both Google and AI systems.

## Suggested next content (factual, cheap)

- "How delivery works in [District]" guides generated from the live zone
  table (one template, 64 factual pages — only if each adds unique value).
- Fabric-care guides per material we actually sell.
