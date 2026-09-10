"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/hono";
import { useLang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

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
    <Button
      variant="secondary"
      size="sm"
      onClick={logout}
      disabled={sending}
      className="rounded-full px-6 py-2.5"
    >
      {sending ? t("account.loggingOut") : t("account.logout")}
    </Button>
  );
}
