"use client";

import { useEffect, useState } from "react";

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

  useEffect(() => {
    const checkToast = () => {
      const nextToast = readToastCookie();

      if (!nextToast) {
        return;
      }

      setToast(nextToast);
      clearToastCookie();
    };

    checkToast();
    const interval = window.setInterval(checkToast, 650);

    return () => window.clearInterval(interval);
  }, []);

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
      ? "border-blue-300 bg-blue-50 text-blue-700"
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
