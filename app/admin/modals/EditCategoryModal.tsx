'use client';

import { useState, FormEvent } from 'react';
import { RiEdit2Line, RiCloseLine, RiSave2Line } from 'react-icons/ri';

interface Category {
  id: number;
  name: string;
}

interface EditCategoryModalProps {
  category: Category;
  onCloseAction: () => void;
  onUpdatedAction: (updated: Category) => void;
}

export default function EditCategoryModal({ category, onCloseAction, onUpdatedAction }: EditCategoryModalProps) {
  const [form, setForm] = useState<Category>({ ...category });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onUpdatedAction({ ...form });
    onCloseAction();
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex justify-center items-center z-50">
      <div className="bg-neutral-900 rounded-lg p-6 w-[350px] border border-gray-700 text-white shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <RiEdit2Line className="text-blue-400" />
            Edit Category
          </h2>
          <button
            onClick={onCloseAction}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            <RiCloseLine size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="block mb-1 text-sm font-medium">Category Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="bg-black border border-gray-700 w-full p-2 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-600"
              required
            />
          </div>

          <div className="flex justify-end space-x-2 mt-4">
            <button
              type="button"
              onClick={onCloseAction}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors"
            >
              <RiCloseLine />
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm transition-colors"
            >
              <RiSave2Line />
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}