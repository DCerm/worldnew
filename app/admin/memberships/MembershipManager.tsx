"use client";

import { useState } from "react";

import {
  createMembershipPlanAction,
  updateMembershipPlanAction,
} from "@/app/actions";
import type { MembershipPlan } from "@/lib/data";
import FormSubmitButton from "@/app/ui/form-submit-button";

type Props = {
  plans: MembershipPlan[];
};

export default function MembershipManager({ plans }: Props) {
  const [isAddOpen, setIsAddOpen] = useState(false);

  return (
    <>
      <div className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-stone-950">Membership Plans</h1>
            <p className="mt-2 text-sm text-stone-600">
              Manage plan features and WooCommerce product mapping. Prices are read from WordPress.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="rounded-full bg-[#F839A9] px-4 py-2 text-sm font-semibold text-white"
          >
            Add New
          </button>
        </div>
      </div>

      <div className="mt-6 space-y-5">
        {plans.map((plan) => (
          <form
            key={plan.id}
            action={updateMembershipPlanAction}
            className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm"
          >
            <input type="hidden" name="planId" value={plan.id} />

            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-stone-950">{plan.name}</h2>
              <span className="text-xs uppercase tracking-[0.2em] text-stone-500">
                {plan.durationDays} days
              </span>
            </div>

            <p className="mt-2 text-xs uppercase tracking-[0.18em] text-stone-500">
              code: {plan.code}
            </p>

            <div className="mt-4 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-stone-500">
                Current WooCommerce price
              </p>
              <p className="mt-1 text-lg font-semibold text-stone-950">
                £{plan.priceAmount}
              </p>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-stone-500">
                  Duration days
                </label>
                <input
                  name="durationDays"
                  defaultValue={plan.durationDays}
                  inputMode="numeric"
                  className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-stone-500">
                  Sort order
                </label>
                <input
                  name="sortOrder"
                  defaultValue={plan.sortOrder}
                  inputMode="numeric"
                  className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400"
                />
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-stone-500">
                  Woo product ID
                </label>
                <input
                  name="wordpressProductId"
                  defaultValue={plan.wordpressProductId ?? ""}
                  inputMode="numeric"
                  placeholder="Required for price sync"
                  className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-stone-500">
                  Woo variation ID (optional)
                </label>
                <input
                  name="wordpressVariationId"
                  defaultValue={plan.wordpressVariationId ?? ""}
                  inputMode="numeric"
                  className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400"
                />
              </div>
            </div>

            <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.15em] text-stone-500">
              Features (one per line)
            </label>
            <textarea
              name="features"
              rows={5}
              defaultValue={plan.features.join("\n")}
              className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400"
            />

            <label className="mt-4 inline-flex items-center gap-2 text-xs text-stone-700">
              <input
                type="checkbox"
                name="isActive"
                defaultChecked={plan.isActive}
                className="h-4 w-4 accent-[#F839A9]"
              />
              Plan is active
            </label>

            <FormSubmitButton
              idleLabel="Save membership plan"
              pendingLabel="Saving plan..."
              className="mt-4 rounded-full bg-[#F839A9] px-5 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
            />
          </form>
        ))}
      </div>

      {isAddOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-2xl rounded-2xl border border-stone-200 bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Create membership</p>
                <h3 className="mt-1 text-2xl font-semibold text-stone-950">New plan</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="rounded-full border border-stone-300 px-3 py-1 text-sm text-stone-700"
              >
                Close
              </button>
            </div>

            <form action={createMembershipPlanAction} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  name="name"
                  placeholder="Plan name (e.g. Weekend Access)"
                  className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400"
                />
                <input
                  name="code"
                  placeholder="Plan code (e.g. weekend)"
                  className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400"
                />
              </div>
              <textarea
                name="description"
                rows={3}
                placeholder="Short plan description"
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400"
              />
              <div className="grid gap-3 sm:grid-cols-3">
                <input
                  name="durationDays"
                  inputMode="numeric"
                  placeholder="Duration days"
                  className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400"
                />
                <input
                  name="sortOrder"
                  inputMode="numeric"
                  placeholder="Sort order"
                  className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400"
                />
                <div className="flex items-center rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-500">
                  Price comes from WooCommerce
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <input
                  name="wordpressProductId"
                  inputMode="numeric"
                  placeholder="Woo product ID"
                  className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400"
                />
                <input
                  name="wordpressVariationId"
                  inputMode="numeric"
                  placeholder="Woo variation ID (optional)"
                  className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400"
                />
              </div>
              <textarea
                name="features"
                rows={5}
                placeholder="Features (one per line)"
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400"
              />
              <label className="inline-flex items-center gap-2 text-xs text-stone-700">
                <input type="checkbox" name="isActive" defaultChecked className="h-4 w-4 accent-[#F839A9]" />
                Plan is active
              </label>

              <div className="flex items-center gap-2 pt-1">
                <FormSubmitButton
                  idleLabel="Create membership"
                  pendingLabel="Creating..."
                  className="rounded-full bg-[#F839A9] px-5 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
                />
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="rounded-full border border-stone-300 px-5 py-2 text-sm font-semibold text-stone-700"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
