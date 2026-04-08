import Link from "next/link";

import { registerAction } from "@/app/actions";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-950 px-6 py-12 text-white">
      <div className="w-full max-w-md rounded-[2rem] border border-stone-800 bg-stone-900 p-8 shadow-2xl">
        <p className="text-sm uppercase tracking-[0.35em] text-[#0091ff]">Register</p>
        <h1 className="mt-3 text-4xl font-semibold">Create your account</h1>
        <p className="mt-3 text-sm text-stone-400">
          Get started with a free account. No credit card required.
        </p>

        {error && (
          <div className="mt-4 rounded-2xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <form action={registerAction} className="mt-6 space-y-4">
          <input
            name="displayName"
            placeholder="Display name"
            className="hidden w-full rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3 text-sm"
          />
          <input
            name="username"
            placeholder="Username"
            className="w-full rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3 text-sm"
          />
          <input
            name="email"
            type="email"
            placeholder="Email"
            className="w-full rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3 text-sm"
          />
          <input
            name="password"
            type="password"
            placeholder="Password"
            className="w-full rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3 text-sm"
          />
          <button className="w-full rounded-full bg-[#0091ff] px-5 py-3 text-sm font-semibold text-white">
            Create account
          </button>
        </form>

        <p className="mt-6 text-sm text-stone-400">
          Already signed up?{" "}
          <Link href="/login" className="text-[#0091ff]">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
