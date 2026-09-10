"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  LOCALE_COOKIE,
  switchLocalePath,
  type Locale,
} from "./locale";

export type Lang = Locale;

const STORAGE_KEY = "deshicart:lang";

const dict = {
  en: {
    "nav.home": "Home",
    "nav.shop": "Shop All",
    "nav.tshirts": "T-Shirts",
    "nav.shirts": "Shirts",
    "nav.women": "Women",
    "nav.accessories": "Accessories",
    "header.search": "Search products",
    "header.account": "My account",
    "header.login": "Log in",
    "header.menu": "Toggle menu",
    "header.announce": "Free delivery across Bangladesh on orders over ৳3,000 · Cash on delivery available",
    "cart.title": "Your Bag",
    "cart.close": "Close cart",
    "cart.empty": "Your bag is empty",
    "cart.emptyHint": "Fresh drops are waiting. Find something you love.",
    "cart.start": "Start Shopping",
    "cart.moreForFree": "Add",
    "cart.freeDelivery": "more for free delivery",
    "cart.unlocked": "🎉 You've unlocked free delivery!",
    "cart.remove": "Remove",
    "cart.decrease": "Decrease quantity",
    "cart.increase": "Increase quantity",
    "cart.subtotal": "Subtotal",
    "cart.delivery": "Delivery",
    "cart.free": "Free",
    "cart.checkout": "Checkout",
    "cart.continue": "Continue shopping",
    "cart.size": "Size",
    "footer.blurb":
      "Trend-forward clothing and accessories, designed in Dhaka for the young and the bold. Premium fabrics, honest prices, delivered to your doorstep anywhere in Bangladesh.",
    "footer.shop": "Shop",
    "footer.all": "All Products",
    "footer.support": "Support",
    "footer.faq": "FAQ",
    "footer.shipping": "Shipping & Delivery",
    "footer.returns": "Returns & Exchanges",
    "footer.contact": "Contact Us",
    "footer.rights": "Crafted with pride in Bangladesh 🇧🇩",
    "footer.developed": "Developed by",
    "auth.welcomeBack": "Welcome back",
    "auth.login": "Log in",
    "auth.email": "Email",
    "auth.password": "Password",
    "auth.newHere": "New to DeshiCart?",
    "auth.createLink": "Create an account",
    "auth.join": "Join DeshiCart",
    "auth.createTitle": "Create account",
    "auth.fullName": "Full name",
    "auth.phone": "Phone",
    "auth.passwordMin": "Password (min 8 characters)",
    "auth.haveAccount": "Already have an account?",
    "auth.loginLink": "Log in",
    "auth.loggingIn": "Logging in…",
    "auth.creating": "Creating account…",
    "checkout.almost": "Almost there",
    "checkout.title": "Checkout",
    "checkout.contact": "1 · Contact Details",
    "checkout.fullName": "Full name *",
    "checkout.phone": "Phone *",
    "checkout.email": "Email *",
    "checkout.delivery": "2 · Delivery Address",
    "checkout.street": "Street address *",
    "checkout.division": "Division *",
    "checkout.district": "District *",
    "checkout.upazila": "Upazila / Thana",
    "checkout.postcode": "Postcode",
    "checkout.notes": "Delivery notes",
    "checkout.payment": "3 · Payment",
    "checkout.summary": "Order Summary",
    "checkout.discount": "Discount",
    "checkout.couponPh": "Coupon code",
    "checkout.apply": "Apply",
    "checkout.remove": "Remove",
    "checkout.total": "Total",
    "checkout.placing": "Placing order…",
    "checkout.placeOrder": "Place Order",
    "checkout.secure": "🔒 Secure checkout · 7-day easy exchange",
    "checkout.browse": "Browse the Shop",
    "checkout.selectDivision": "Select division…",
    "checkout.selectDistrict": "Select district…",
    "checkout.selectUpazila": "Select upazila…",
    "account.hello": "Hello",
    "account.kicker": "My account",    "account.orders": "Order history",
    "account.noOrders": "You haven't placed any orders yet.",
    "account.startShopping": "Start shopping",
    "account.addresses": "Saved addresses",
    "account.returns": "Return requests",
    "account.wishlist": "My wishlist →",
    "account.logout": "Log out",
    "account.loggingOut": "Logging out…",
    "product.reviews": "Customer Reviews",
    "product.related": "You may also like",
    "product.noReviews": "No reviews yet",
    "product.noReviewsHint": "Be the first to share your thoughts on this piece.",
    "wishlist.kicker": "Saved for later",
    "wishlist.title": "Wishlist",
    "wishlist.empty": "Nothing saved yet",
    "wishlist.emptyHint": "Tap the heart on any product to keep it here.",
    "wishlist.browse": "Browse the Shop",
    "shop.allCollection": "The full collection",
    "shop.noMatch": "Nothing matched that",
    "shop.noMatchHint": "Try a different search, or clear the filters to see the full collection.",
    "shop.clearFilters": "Clear filters",
  },
  bn: {
    "nav.home": "হোম",
    "nav.shop": "সব পণ্য",
    "nav.tshirts": "টি-শার্ট",
    "nav.shirts": "শার্ট",
    "nav.women": "নারী",
    "nav.accessories": "অ্যাক্সেসরিজ",
    "header.search": "পণ্য খুঁজুন",
    "header.account": "আমার অ্যাকাউন্ট",
    "header.login": "লগইন",
    "header.menu": "মেনু",
    "header.announce": "৳৩,০০০+ অর্ডারে সারা বাংলাদেশে ফ্রি ডেলিভারি · ক্যাশ অন ডেলিভারি",
    "cart.title": "আপনার ব্যাগ",
    "cart.close": "ব্যাগ বন্ধ করুন",
    "cart.empty": "আপনার ব্যাগ খালি",
    "cart.emptyHint": "নতুন কালেকশন অপেক্ষা করছে। পছন্দের কিছু খুঁজুন।",
    "cart.start": "কেনাকাটা শুরু করুন",
    "cart.moreForFree": "আরও",
    "cart.freeDelivery": "কিনলে ফ্রি ডেলিভারি",
    "cart.unlocked": "🎉 ফ্রি ডেলিভারি আনলক হয়েছে!",
    "cart.remove": "সরান",
    "cart.decrease": "পরিমাণ কমান",
    "cart.increase": "পরিমাণ বাড়ান",
    "cart.subtotal": "সাবটোটাল",
    "cart.delivery": "ডেলিভারি",
    "cart.free": "ফ্রি",
    "cart.checkout": "চেকআউট",
    "cart.continue": "আরও কেনাকাটা করুন",
    "cart.size": "সাইজ",
    "footer.blurb":
      "ঢাকায় ডিজাইন করা ট্রেন্ডি পোশাক ও অ্যাক্সেসরিজ — তরুণ ও সাহসীদের জন্য। প্রিমিয়াম ফেব্রিক, সৎ দাম, বাংলাদেশের যেকোনো প্রান্তে ডেলিভারি।",
    "footer.shop": "কেনাকাটা",
    "footer.all": "সব পণ্য",
    "footer.support": "সহায়তা",
    "footer.faq": "জিজ্ঞাসা",
    "footer.shipping": "ডেলিভারি তথ্য",
    "footer.returns": "রিটার্ন ও এক্সচেঞ্জ",
    "footer.contact": "যোগাযোগ",
    "footer.rights": "গর্বের সাথে বাংলাদেশে তৈরি 🇧🇩",
    "footer.developed": "ডেভেলপ করেছেন",
    "auth.welcomeBack": "ফিরে আসায় স্বাগতম",
    "auth.login": "লগইন",
    "auth.email": "ইমেইল",
    "auth.password": "পাসওয়ার্ড",
    "auth.newHere": "DeshiCart-এ নতুন?",
    "auth.createLink": "অ্যাকাউন্ট খুলুন",
    "auth.join": "DeshiCart-এ যোগ দিন",
    "auth.createTitle": "অ্যাকাউন্ট খুলুন",
    "auth.fullName": "পুরো নাম",
    "auth.phone": "ফোন",
    "auth.passwordMin": "পাসওয়ার্ড (কমপক্ষে ৮ অক্ষর)",
    "auth.haveAccount": "ইতিমধ্যে অ্যাকাউন্ট আছে?",
    "auth.loginLink": "লগইন",
    "auth.loggingIn": "লগইন হচ্ছে…",
    "auth.creating": "অ্যাকাউন্ট তৈরি হচ্ছে…",
    "checkout.almost": "প্রায় হয়ে গেছে",
    "checkout.title": "চেকআউট",
    "checkout.contact": "১ · যোগাযোগের তথ্য",
    "checkout.fullName": "পুরো নাম *",
    "checkout.phone": "ফোন *",
    "checkout.email": "ইমেইল *",
    "checkout.delivery": "২ · ডেলিভারির ঠিকানা",
    "checkout.street": "রাস্তার ঠিকানা *",
    "checkout.division": "বিভাগ *",
    "checkout.district": "জেলা *",
    "checkout.upazila": "উপজেলা / থানা",
    "checkout.postcode": "পোস্টকোড",
    "checkout.notes": "ডেলিভারি নোট",
    "checkout.payment": "৩ · পেমেন্ট",
    "checkout.summary": "অর্ডার সামারি",
    "checkout.discount": "ছাড়",
    "checkout.couponPh": "কুপন কোড",
    "checkout.apply": "প্রয়োগ",
    "checkout.remove": "সরান",
    "checkout.total": "মোট",
    "checkout.placing": "অর্ডার হচ্ছে…",
    "checkout.placeOrder": "অর্ডার করুন",
    "checkout.secure": "🔒 নিরাপদ চেকআউট · ৭ দিনের সহজ এক্সচেঞ্জ",
    "checkout.browse": "শপ দেখুন",
    "checkout.selectDivision": "বিভাগ বেছে নিন…",
    "checkout.selectDistrict": "জেলা বেছে নিন…",
    "checkout.selectUpazila": "উপজেলা বেছে নিন…",
    "account.hello": "হ্যালো",
    "account.kicker": "আমার অ্যাকাউন্ট",
    "account.orders": "অর্ডার হিস্ট্রি",
    "account.noOrders": "আপনি এখনও কোনো অর্ডার করেননি।",
    "account.startShopping": "কেনাকাটা শুরু করুন",
    "account.addresses": "সংরক্ষিত ঠিকানা",
    "account.returns": "রিটার্ন অনুরোধ",
    "account.wishlist": "আমার উইশলিস্ট →",
    "account.logout": "লগআউট",
    "account.loggingOut": "লগআউট হচ্ছে…",
    "product.reviews": "ক্রেতা রিভিউ",
    "product.related": "আপনার পছন্দ হতে পারে",
    "product.noReviews": "এখনও কোনো রিভিউ নেই",
    "product.noReviewsHint": "এই পণ্য সম্পর্কে প্রথম মতামত দিন।",
    "wishlist.kicker": "পরে দেখার জন্য",
    "wishlist.title": "উইশলিস্ট",
    "wishlist.empty": "এখনও কিছু সংরক্ষণ করেননি",
    "wishlist.emptyHint": "পছন্দের পণ্যে হার্ট চাপুন।",
    "wishlist.browse": "শপ দেখুন",
    "shop.allCollection": "সম্পূর্ণ কালেকশন",
    "shop.noMatch": "কিছুই মেলেনি",
    "shop.noMatchHint": "অন্য কিছু খুঁজুন, অথবা ফিল্টার মুছে সম্পূর্ণ কালেকশন দেখুন।",
    "shop.clearFilters": "ফিল্টার মুছুন",
  },
} as const;

export type DictKey = keyof (typeof dict)["en"];

/** Server-component translator (no context needed). */
export function tFor(lang: Lang, key: DictKey): string {
  return dict[lang][key] ?? dict.en[key];
}

type LangContextValue = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: DictKey) => string;
};

const LangContext = createContext<LangContextValue | null>(null);

export function LangProvider({
  children,
  initialLang,
}: {
  children: ReactNode;
  initialLang: Lang;
}) {
  // Language comes from the URL (/bn, /en); the toggle below navigates
  // between locales instead of swapping client state (SEO-friendly URLs).
  const [lang] = useState<Lang>(initialLang);

  const setLang = useCallback((_l: Lang) => {
    // Kept for API compatibility; use <LangToggle /> to switch languages.
  }, []);

  const t = useCallback(
    (key: DictKey) => dict[lang][key] ?? dict.en[key],
    [lang]
  );

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang(): LangContextValue {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used within LangProvider");
  return ctx;
}

export function LangToggle() {
  const { lang } = useLang();
  const router = useRouter();
  const pathname = usePathname();
  const other: Lang = lang === "en" ? "bn" : "en";

  const switchLang = () => {
    try {
      document.cookie = `${LOCALE_COOKIE}=${other}; Path=/; Max-Age=31536000`;
      window.localStorage.setItem(STORAGE_KEY, other);
    } catch {
      // ignore
    }
    router.push(switchLocalePath(pathname, other));
  };

  return (
    <button
      onClick={switchLang}
      className="rounded-full border border-sand bg-white px-3 py-1.5 text-[11px] font-bold tracking-wide text-ink-soft transition-colors hover:border-clay hover:text-clay"
      aria-label={lang === "en" ? "বাংলায় দেখুন" : "View in English"}
    >
      {lang === "en" ? "বাং" : "EN"}
    </button>
  );
}
