'use client';

import { useState, FormEvent } from 'react';
import { FiX, FiSave, FiPlus } from 'react-icons/fi'; // Example icons from react-icons/fi

interface AddCategoryModalProps {
  onCloseAction: () => void;
  onAddedAction: (name: string) => void;
}

export default function AddCategoryModal({ onCloseAction, onAddedAction }: AddCategoryModalProps) {
  const [name, setName] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (name.trim() !== '') {
      onAddedAction(name.trim());
      onCloseAction();
      setName('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex justify-center items-center z-50">
      <div className="bg-neutral-900 rounded-lg p-6 w-[350px] border border-gray-700 text-white shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FiPlus className="text-blue-500" />
            Add New Category
          </h2>
          <button onClick={onCloseAction} className="text-gray-400 hover:text-white">
            <FiX size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="block mb-1 text-sm font-medium">Category Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-black border border-gray-700 w-full p-2 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-600"
              required
            />
          </div>

          <div className="flex justify-end space-x-2 mt-4">
            <button
              type="button"
              onClick={onCloseAction}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm"
            >
              <FiX />
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm"
            >
              <FiSave />
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}