"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type Lang = "en" | "bn";

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
  },
} as const;

export type DictKey = keyof (typeof dict)["en"];

type LangContextValue = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: DictKey) => string;
};

const LangContext = createContext<LangContextValue | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      // Intentional external-system sync: apply the saved language once after
      // mount (server renders English to avoid hydration mismatch).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved === "bn" || saved === "en") setLangState(saved);
    } catch {
      // storage may be unavailable
    }
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      window.localStorage.setItem(STORAGE_KEY, l);
    } catch {
      // ignore
    }
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
  const { lang, setLang } = useLang();
  return (
    <button
      onClick={() => setLang(lang === "en" ? "bn" : "en")}
      className="rounded-full border border-sand bg-white px-3 py-1.5 text-[11px] font-bold tracking-wide text-ink-soft transition-colors hover:border-clay hover:text-clay"
      aria-label={lang === "en" ? "বাংলায় দেখুন" : "View in English"}
    >
      {lang === "en" ? "বাং" : "EN"}
    </button>
  );
}
