# Components

Shared UI lives in `src/components/`. Rules (§29–30): a component becomes
shared only on genuine reuse; business logic stays in `src/lib/*` and Hono
services — never inside presentation components.

## Storefront

- `ProductCard` (grid tile: badges, From-price, rating, quick-add, wishlist;
  takes `product`, `wishlisted`, `variantInfo?`, `lang`)
- `ProductCard` helpers: `Gallery`, `PurchasePanel` (variant selector + qty +
  stock states), `QuickAddButton`, `WishlistButton`, `Stars`
- `Header` (announcement, nav, search/account/wishlist icons, lang toggle,
  mobile menu), `Footer` (shop/support columns, credits), `CartDrawer`,
  `ChatButton` (Messenger float), `ClearCartOnSuccess`
- `FiltersBar` (category pills, search, price, sort — URL-state driven),
  `ContactForm`, `ReviewForm`, `AddressManager`, `ReturnRequestButton`,
  `LogoutButton`

## Admin (backoffice only — never imported by storefront)

- `ProductForm` (+Bangla fields), `VariantManager`, `ImageManager`,
  `InventoryManager`, `CategoryManager`, `CouponManager`, `ZoneManager`,
  `ShippingRuleManager`, `GatewayManager`, `OrderStatusForm`,
  `ReviewModeration`, `ReturnActions`

## Conventions

- Server components by default; `"use client"` only for interactivity.
- Styling: Tailwind v4 theme tokens (`ink/cream/sand/clay/leaf/gold`,
  `font-display`); no hardcoded hex in new code.
- Images: `next/image` with `fill` in sized containers; remote patterns for
  Pexels + `*.imagekit.io` in `next.config.ts`.
- Forms: controlled inputs + server-returned error strings; destructive
  actions confirm first.
