"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

function hasToastCookie() {
  return document.cookie
    .split("; ")
    .some((entry) => entry.startsWith("worldnew_toast="));
}

export default function ActionFeedback() {
  const [isWorking, setIsWorking] = useState(false);
  const pathname = usePathname();
  const timeoutRef = useRef<number | null>(null);
  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    // Route completion generally means the action completed.
    setIsWorking(false);
  }, [pathname]);

  useEffect(() => {
    const clearTimers = () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      if (pollRef.current) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };

    const finish = () => {
      setIsWorking(false);
      clearTimers();
    };

    const start = () => {
      setIsWorking(true);
      clearTimers();

      // Safety timeout so we never stay stuck in loading forever.
      timeoutRef.current = window.setTimeout(finish, 25000);

      // Poll briefly for toast cookie when action completes on same route.
      pollRef.current = window.setInterval(() => {
        if (hasToastCookie()) {
          finish();
        }
      }, 250);
    };

    const onSubmit = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLFormElement)) {
        return;
      }

      const method = (target.getAttribute("method") ?? "post").toLowerCase();
      if (method !== "post") {
        return;
      }

      start();
    };

    window.addEventListener("worldnew:toast-received", finish);
    document.addEventListener("submit", onSubmit, true);
    window.addEventListener("pageshow", finish);

    return () => {
      clearTimers();
      window.removeEventListener("worldnew:toast-received", finish);
      document.removeEventListener("submit", onSubmit, true);
      window.removeEventListener("pageshow", finish);
    };
  }, []);

  if (!isWorking) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[120] flex justify-center px-4">
      <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-[#F839A9]/40 bg-[#001531]/95 px-4 py-2 text-xs font-semibold uppercase tracking-[0.15em] text-[#F839A9] shadow-lg">
        <span className="h-2 w-2 animate-pulse rounded-full bg-[#F839A9]" />
        Processing your request...
      </div>
    </div>
  );
}
