"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/hono";
import { useLang } from "@/lib/i18n";

export default function LogoutButton() {
  const router = useRouter();
  const { t } = useLang();
  const [sending, setSending] = useState(false);

  const logout = async () => {
    setSending(true);
    try {
      await authClient.logout.$post();
    } finally {
      router.push("/");
      router.refresh();
    }
  };

  return (
    <button
      onClick={logout}
      disabled={sending}
      className="rounded-full border border-sand bg-white px-6 py-2.5 text-sm font-bold text-ink-soft transition-colors hover:border-clay hover:text-clay disabled:opacity-60"
    >
      {sending ? t("account.loggingOut") : t("account.logout")}
    </button>
  );
}
