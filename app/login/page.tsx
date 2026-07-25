import Link from "next/link";

import { loginAction } from "@/app/actions";
import { getCurrentUser } from "@/lib/auth";
import PasswordField from "@/app/ui/password-field";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    attemptsLeft?: string;
    retryAfterMinutes?: string;
  }>;
}) {
  const user = await getCurrentUser();
  const { error, attemptsLeft, retryAfterMinutes } = await searchParams;
  const attemptsLeftCount = Number(attemptsLeft ?? "");
  const retryAfterCount = Number(retryAfterMinutes ?? "");
  const showAttempts =
    Number.isFinite(attemptsLeftCount) && attemptsLeftCount > 0
      ? attemptsLeftCount
      : null;
  const showRetryAfter =
    Number.isFinite(retryAfterCount) && retryAfterCount > 0
      ? retryAfterCount
      : null;
  const authMessage = showRetryAfter !== null
    ? `Too many failed sign-in attempts. Try again in about ${showRetryAfter} minute${showRetryAfter === 1 ? "" : "s"}.`
    : showAttempts !== null
      ? `Incorrect username or password. ${showAttempts} attempt${showAttempts === 1 ? "" : "s"} remaining.`
      : error ?? "";
  const authToneClass =
    showRetryAfter !== null || showAttempts !== null
      ? "border-amber-400/30 bg-amber-400/10 text-amber-100"
      : "border-red-400/30 bg-red-400/10 text-red-200";

  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-950 px-6 py-12 text-white">
      <div className="w-full max-w-md rounded-[2rem] border border-stone-800 bg-stone-900 p-8 shadow-2xl">
        <p className="text-sm uppercase tracking-[0.35em] text-[#F839A9]">Sign In</p>
        <h1 className="mt-3 text-4xl font-semibold">Welcome back</h1>
        <p className="mt-3 text-md text-stone-400">
          Sign in with your World New account.
        </p>

        {user && (
          <div className="mt-4 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
            You are already signed in.
          </div>
        )}

        {authMessage && (
          <div className={`mt-4 rounded-2xl px-4 py-3 text-sm ${authToneClass}`}>
            {authMessage}
          </div>
        )}

        <form action={loginAction} className="mt-6 space-y-4">
          <input
            name="email"
            type="email"
            placeholder="Email"
            className="w-full rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3 text-sm"
          />
          <PasswordField
            name="password"
            placeholder="Password"
            autoComplete="current-password"
            className="w-full rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3 text-sm"
          />
          <button className="w-full rounded-full bg-[#F839A9] px-5 py-3 text-sm font-semibold text-white">
            Sign in
          </button>
        </form>

        <div className="mt-4 rounded-2xl border border-stone-800 bg-stone-950/80 px-4 py-3 text-sm text-stone-300">
          Forgot your password?{" "}
          <Link href="/forgot-password" className="font-semibold text-[#F839A9] underline-offset-4 hover:underline">
            Reset it here
          </Link>
          .
        </div>

        <p className="mt-6 text-sm text-stone-400">
          No account yet?{" "}
          <Link href="/register" className="text-[#F839A9]">
            Create one
          </Link>
        </p>
      </div>
    </main>
  );
}
