"use client";

import { useEffect, useState } from "react";
import { toast, Toaster } from "sonner";
import { redirectIfSessionExpired } from "@/lib/auth/client-reauth";

export function ThemedToaster() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const sync = () => {
      setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
    };
    sync();

    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  // Session expiry should log the user out silently — never show "Unauthorized".
  useEffect(() => {
    const originalError = toast.error.bind(toast);
    toast.error = ((message, data) => {
      if (redirectIfSessionExpired(message)) return;
      return originalError(message, data);
    }) as typeof toast.error;

    return () => {
      toast.error = originalError;
    };
  }, []);

  return <Toaster position="top-center" richColors dir="rtl" theme={theme} />;
}
