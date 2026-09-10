# Search Console Setup

1. **Verify ownership:** Google Search Console → Add property →
   `https://deshi-cart.vercel.app` (or the custom domain) → verify via the
   Vercel-recommended method (DNS TXT is most robust).
2. **Submit sitemaps:** Sitemaps → Add `https://<domain>/sitemap.xml`.
   One sitemap covers both locales.
3. **International targeting:** Search Console has no geo-targeting per path;
   hreflang (`bn`/`en`/`x-default`, emitted on every public page) does the
   job — confirm under *Pages → alternate page with proper canonical tag*
   after the first crawl.
4. **Rich results:** monitor *Enhancements → Products / FAQ / Breadcrumbs*
   for errors after product publishes. Fix data issues in
   `src/lib/structured-data.tsx`, not by editing rendered HTML.
5. **Removals:** if an admin/deleted URL ever gets indexed, use Removals →
   Temporary, then confirm `robots.txt` + 404 coverage (see SEO-CHECKLIST).
6. **Bing Webmaster Tools:** repeat steps 1–2 (Bing powers ChatGPT citations
   and Copilot answers).
