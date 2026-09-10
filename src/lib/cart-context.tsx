"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type CartItem = {
  productId: number;
  variantId: number | null;
  slug: string;
  name: string;
  price: number;
  image: string;
  size: string | null;
  sku: string | null;
  quantity: number;
};

type CartContextValue = {
  items: CartItem[];
  count: number;
  subtotal: number;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  removeItem: (productId: number, size: string | null, variantId?: number | null) => void;
  updateQuantity: (productId: number, size: string | null, quantity: number, variantId?: number | null) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = "deshicart:cart:v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const hydrated = useRef(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      // Intentional external-system sync: hydrate client cart once after mount
      // (server renders empty to avoid hydration mismatch).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setItems(JSON.parse(raw));
    } catch {
      // ignore corrupted storage
    }
    hydrated.current = true;
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // storage may be unavailable
    }
  }, [items]);

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  const addItem = useCallback(
    (item: Omit<CartItem, "quantity">, quantity = 1) => {
      const variantId = item.variantId ?? null;
      setItems((prev) => {
        const idx = prev.findIndex(
          (i) =>
            i.productId === item.productId &&
            i.size === item.size &&
            (i.variantId ?? null) === variantId
        );
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], quantity: next[idx].quantity + quantity };
          return next;
        }
        return [...prev, { ...item, variantId, sku: item.sku ?? null, quantity }];
      });
      setIsOpen(true);
    },
    []
  );

  const matches = (
    i: CartItem,
    productId: number,
    size: string | null,
    variantId?: number | null
  ) =>
    i.productId === productId &&
    i.size === size &&
    (variantId === undefined || (i.variantId ?? null) === (variantId ?? null));

  const removeItem = useCallback(
    (productId: number, size: string | null, variantId?: number | null) => {
      setItems((prev) => prev.filter((i) => !matches(i, productId, size, variantId)));
    },
    []
  );

  const updateQuantity = useCallback(
    (
      productId: number,
      size: string | null,
      quantity: number,
      variantId?: number | null
    ) => {
      setItems((prev) =>
        quantity <= 0
          ? prev.filter((i) => !matches(i, productId, size, variantId))
          : prev.map((i) =>
              matches(i, productId, size, variantId) ? { ...i, quantity } : i
            )
      );
    },
    []
  );

  const clearCart = useCallback(() => setItems([]), []);

  const value = useMemo(() => {
    const count = items.reduce((acc, i) => acc + i.quantity, 0);
    const subtotal = items.reduce((acc, i) => acc + i.price * i.quantity, 0);
    return {
      items,
      count,
      subtotal,
      isOpen,
      openCart,
      closeCart,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
    };
  }, [items, isOpen, openCart, closeCart, addItem, removeItem, updateQuantity, clearCart]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
