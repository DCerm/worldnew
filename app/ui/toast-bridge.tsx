"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type ToastPayload = {
  id: number;
  message: string;
  type: "success" | "error" | "info";
};

function readToastCookie() {
  const match = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith("worldnew_toast="));

  if (!match) {
    return null;
  }

  const raw = match.slice("worldnew_toast=".length);

  try {
    return JSON.parse(decodeURIComponent(raw)) as ToastPayload;
  } catch {
    return null;
  }
}

function clearToastCookie() {
  document.cookie = "worldnew_toast=; Max-Age=0; path=/; SameSite=Lax";
}

export default function ToastBridge() {
  const [toast, setToast] = useState<ToastPayload | null>(null);
  const pathname = usePathname();

  const checkToast = useCallback(() => {
    const nextToast = readToastCookie();

    if (!nextToast) {
      return;
    }

    setToast(nextToast);
    clearToastCookie();
    window.dispatchEvent(new Event("worldnew:toast-received"));
  }, []);

  useEffect(() => {
    checkToast();
    // Server action cookies can arrive just after navigation commits.
    const delayedCheck = window.setTimeout(checkToast, 180);
    return () => window.clearTimeout(delayedCheck);
  }, [checkToast, pathname]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkToast();
      }
    };

    let pollInterval: number | null = null;
    let pollTimeout: number | null = null;

    const stopPolling = () => {
      if (pollInterval) {
        window.clearInterval(pollInterval);
        pollInterval = null;
      }

      if (pollTimeout) {
        window.clearTimeout(pollTimeout);
        pollTimeout = null;
      }
    };

    const startPolling = () => {
      stopPolling();
      checkToast();
      pollInterval = window.setInterval(checkToast, 250);
      pollTimeout = window.setTimeout(stopPolling, 15000);
    };

    const handleSubmit = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLFormElement)) {
        return;
      }

      const method = (target.getAttribute("method") ?? "post").toLowerCase();
      if (method !== "post") {
        return;
      }

      startPolling();
    };

    window.addEventListener("focus", checkToast);
    window.addEventListener("pageshow", checkToast);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("submit", handleSubmit, true);

    return () => {
      stopPolling();
      window.removeEventListener("focus", checkToast);
      window.removeEventListener("pageshow", checkToast);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("submit", handleSubmit, true);
    };
  }, [checkToast]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setToast(null);
    }, 3800);

    return () => window.clearTimeout(timeout);
  }, [toast]);

  if (!toast) {
    return null;
  }

  const palette =
    toast.type === "error"
      ? "border-red-300 bg-red-50 text-red-700"
      : toast.type === "info"
      ? "border-[#F839A9]/40 bg-[#F839A9]/10 text-[#F839A9]"
      : "border-emerald-300 bg-emerald-50 text-emerald-700";

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[100]">
      <div
        className={`pointer-events-auto rounded-2xl border px-4 py-3 text-sm shadow-lg ${palette}`}
        role="status"
        aria-live="polite"
      >
        {toast.message}
      </div>
    </div>
  );
}
