"use client";

import { useMemo, useState } from "react";

import { createCategoryAction, updateCategoryAction } from "@/app/actions";

type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
};

type Props = {
  categories: Category[];
};

export default function CategoriesManager({ categories }: Props) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const editingCategory = useMemo(
    () => categories.find((category) => category.id === editingId) ?? null,
    [categories, editingId]
  );

  return (
    <>
      <div className="rounded-[2rem] border border-stone-200 bg-white text-gray-600 p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-stone-950">Categories</h1>
            <p className="mt-2 text-sm text-stone-500">
              Create and manage the shelves your audio and video drops land in.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="rounded-full bg-[#0091ff] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#007fe0]"
          >
            Add New
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {categories.map((category) => (
          <article key={category.id} className="rounded-[2rem] border border-stone-200 bg-white text-gray-600 p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-stone-400">{category.slug}</p>
            <h2 className="mt-2 text-xl font-semibold text-stone-950">{category.name}</h2>
            <p className="mt-1 text-sm text-stone-500">{category.description ?? "No description yet."}</p>

            <div className="mt-4">
              <button
                type="button"
                onClick={() => setEditingId(category.id)}
                className="rounded-full border border-[#0091ff] px-4 py-2 text-xs font-semibold text-[#0091ff]"
              >
                Edit
              </button>
            </div>
          </article>
        ))}
      </div>

      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-xl rounded-2xl border border-stone-200 bg-white p-5 text-gray-700 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Add category</p>
                <h3 className="mt-1 text-2xl font-semibold text-stone-950">New category</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="rounded-full border border-stone-300 px-3 py-1 text-sm"
              >
                Close
              </button>
            </div>

            <form action={createCategoryAction} className="space-y-3">
              <input
                name="name"
                placeholder="Category name"
                className="w-full rounded-2xl border border-stone-200 px-4 py-3 text-sm"
              />
              <textarea
                name="description"
                rows={4}
                placeholder="Description"
                className="w-full rounded-2xl border border-stone-200 px-4 py-3 text-sm"
              />
              <div className="flex items-center gap-2">
                <button className="rounded-full bg-[#0091ff] px-4 py-2 text-xs font-semibold text-white">
                  Save category
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="rounded-full border border-stone-300 px-4 py-2 text-xs font-semibold text-stone-700"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-xl rounded-2xl border border-stone-200 bg-white p-5 text-gray-700 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Edit category</p>
                <h3 className="mt-1 text-2xl font-semibold text-stone-950">{editingCategory.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingId(null)}
                className="rounded-full border border-stone-300 px-3 py-1 text-sm"
              >
                Close
              </button>
            </div>

            <form action={updateCategoryAction} className="space-y-3">
              <input type="hidden" name="categoryId" value={editingCategory.id} />
              <input
                name="name"
                defaultValue={editingCategory.name}
                placeholder="Category name"
                className="w-full rounded-2xl border border-stone-200 px-4 py-3 text-sm"
              />
              <textarea
                name="description"
                defaultValue={editingCategory.description ?? ""}
                rows={4}
                placeholder="Description"
                className="w-full rounded-2xl border border-stone-200 px-4 py-3 text-sm"
              />
              <div className="flex items-center gap-2">
                <button className="rounded-full bg-[#0091ff] px-4 py-2 text-xs font-semibold text-white">
                  Save changes
                </button>
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="rounded-full border border-stone-300 px-4 py-2 text-xs font-semibold text-stone-700"
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
