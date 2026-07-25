import Link from "next/link";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { getMembershipPlans } from "@/lib/data";
import { startGiftMembershipCheckoutAction } from "@/app/actions";
import FormSubmitButton from "@/app/ui/form-submit-button";

export default async function GiftMembershipPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string; error?: string }>;
}) {
  const user = await requireUser();
  const plans = await getMembershipPlans();
  const resolvedSearchParams = await searchParams;
  const returnTo = resolvedSearchParams.returnTo?.trim() || "/dashboard";

  if (plans.length === 0) {
    redirect(returnTo);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-8 px-4 py-8 lg:px-8">
      <div className="overflow-hidden rounded-[2rem] border border-stone-200 bg-white shadow-[0_28px_60px_-40px_rgba(0,0,0,0.45)]">
        <div className="border-b border-stone-200 bg-gradient-to-r from-[#F839A9] via-[#F839A9] to-[#F839A9] px-6 py-8 text-white">
          <p className="text-xs uppercase tracking-[0.3em] text-white/80">Gift Membership</p>
          <h1 className="mt-3 text-3xl font-semibold">Send community access to someone else</h1>
          <p className="mt-3 max-w-2xl text-sm text-white/90">
            Pick a membership plan, then enter the recipient&apos;s email address or username.
            If that identifier matches an existing World New account, that account gets the access.
          </p>
        </div>

        <div className="p-6 lg:p-8">
          {resolvedSearchParams.error ? (
            <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {resolvedSearchParams.error}
            </div>
          ) : null}

          <form action={startGiftMembershipCheckoutAction} className="space-y-6">
            <input type="hidden" name="returnTo" value={returnTo} />

            <div className="grid gap-6 lg:grid-cols-2">
              <label className="block">
                <span className="text-sm font-semibold text-stone-900">Gift to</span>
                <input
                  name="recipientIdentifier"
                  type="text"
                  placeholder="Recipient email or username"
                  className="mt-2 w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700 outline-none transition focus:border-[#F839A9] focus:bg-white"
                  required
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-stone-900">Membership plan</span>
                <select
                  name="planCode"
                  defaultValue={plans[0]?.code ?? ""}
                  className="mt-2 w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700 outline-none transition focus:border-[#F839A9] focus:bg-white"
                  required
                >
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.code}>
                      {plan.name} - £{plan.priceAmount}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="rounded-[1.5rem] border border-stone-200 bg-stone-50 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Signed in as</p>
              <p className="mt-2 text-sm text-stone-700">
                {user.displayName} ({user.email})
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <FormSubmitButton
                idleLabel="Continue to WordPress checkout"
                pendingLabel="Preparing checkout..."
                className="rounded-full bg-[#F839A9] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#F839A9] disabled:cursor-not-allowed disabled:opacity-70"
              />
              <Link
                href={returnTo}
                className="rounded-full border border-stone-300 px-5 py-3 text-sm font-semibold text-stone-700 transition hover:border-stone-400 hover:bg-stone-50"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
