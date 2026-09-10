export function formatBDT(amount: number) {
  return `৳${amount.toLocaleString("en-IN")}`;
}

export const FREE_SHIPPING_THRESHOLD = 3000;
export const SHIPPING_FLAT = 80;

export function shippingFor(subtotal: number) {
  if (subtotal === 0) return 0;
  return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FLAT;
}
