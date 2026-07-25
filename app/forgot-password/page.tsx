import Link from "next/link";

import { requestPasswordResetAction } from "@/app/actions";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>;
}) {
  const { sent } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-950 px-6 py-12 text-white">
      <div className="w-full max-w-md rounded-[2rem] border border-stone-800 bg-stone-900 p-8 shadow-2xl">
        <p className="text-sm uppercase tracking-[0.35em] text-[#F839A9]">
          Password Reset
        </p>
        <h1 className="mt-3 text-4xl font-semibold">Forgot password?</h1>
        <p className="mt-3 text-md text-stone-400">
          Enter your account email and we&apos;ll send you a reset link.
        </p>

        {sent === "1" && (
          <div className="mt-4 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
            If an account exists for that email, a reset link has been sent.
          </div>
        )}

        <form action={requestPasswordResetAction} className="mt-6 space-y-4">
          <input
            name="email"
            type="email"
            placeholder="Email"
            className="w-full rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3 text-sm"
          />
          <button className="w-full rounded-full bg-[#F839A9] px-5 py-3 text-sm font-semibold text-white">
            Send reset link
          </button>
        </form>

        <p className="mt-6 text-sm text-stone-400">
          Remembered your password?{" "}
          <Link href="/login" className="text-[#F839A9]">
            Back to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
