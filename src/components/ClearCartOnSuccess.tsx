"use client";

import { useEffect } from "react";
import { useCart } from "@/lib/cart-context";

/**
 * After a successful SSLCommerz payment the customer returns here with the bag
 * still intact (it was kept so failed payments don't lose the cart). If this
 * order id matches the pending online payment, clear the bag once.
 */
export default function ClearCartOnSuccess({ orderId }: { orderId: number }) {
  const { clearCart } = useCart();

  useEffect(() => {
    try {
      if (
        window.sessionStorage.getItem("deshicart:pending-order") ===
        String(orderId)
      ) {
        // One-shot sync of external (session) state after mount.
        clearCart();
        window.sessionStorage.removeItem("deshicart:pending-order");
      }
    } catch {
      // session storage may be unavailable
    }
  }, [orderId, clearCart]);

  return null;
}
