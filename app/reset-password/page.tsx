import Link from "next/link";

import { resetPasswordAction } from "@/app/actions";
import PasswordField from "@/app/ui/password-field";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;
  const hasToken = Boolean(token);

  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-950 px-6 py-12 text-white">
      <div className="w-full max-w-md rounded-[2rem] border border-stone-800 bg-stone-900 p-8 shadow-2xl">
        <p className="text-sm uppercase tracking-[0.35em] text-[#F839A9]">
          Password Reset
        </p>
        <h1 className="mt-3 text-4xl font-semibold">Set new password</h1>
        <p className="mt-3 text-md text-stone-400">
          Choose a new password for your account.
        </p>

        {error && (
          <div className="mt-4 rounded-2xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {!hasToken ? (
          <div className="mt-6 rounded-2xl border border-stone-700 bg-stone-950 px-4 py-4 text-sm text-stone-300">
            This reset link is missing or invalid. Request a new one.
          </div>
        ) : (
          <form action={resetPasswordAction} className="mt-6 space-y-4">
            <input type="hidden" name="token" value={token} />
            <PasswordField
              name="newPassword"
              placeholder="New password"
              autoComplete="new-password"
              className="w-full rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3 text-sm"
            />
            <PasswordField
              name="confirmPassword"
              placeholder="Confirm new password"
              autoComplete="new-password"
              className="w-full rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3 text-sm"
            />
            <button className="w-full rounded-full bg-[#F839A9] px-5 py-3 text-sm font-semibold text-white">
              Update password
            </button>
          </form>
        )}

        <p className="mt-6 text-sm text-stone-400">
          Need a new reset link?{" "}
          <Link href="/forgot-password" className="text-[#F839A9]">
            Forgot password
          </Link>
        </p>
      </div>
    </main>
  );
}
