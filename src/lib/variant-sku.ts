// Pure SKU helper (client-safe: no DB imports — keep it that way).

export function suggestSku(
  productId: number,
  color: string,
  size: string
): string {
  const clean = (s: string) =>
    s.toUpperCase().replace(/[^A-Z0-9]+/g, "").slice(0, 12) || "STD";
  return `P${productId}-${clean(color)}-${clean(size)}`;
}
