'use client';

import { useState } from 'react';
import AddCategoryModal from '../modals/AddCategoryModal';
import EditCategoryModal from '../modals/EditCategoryModal';

interface Category {
  id: number;
  name: string;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([
    { id: 1, name: 'Music' },
    { id: 2, name: 'Education' },
    { id: 3, name: 'Entertainment' },
  ]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  const openEditModal = (category: Category) => {
    setSelectedCategory(category);
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setSelectedCategory(null);
  };

  const addCategory = (newName: string) => {
    const newCategory = { id: Date.now(), name: newName };
    setCategories((prev) => [...prev, newCategory]);
  };

  const updateCategory = (updated: Category) => {
    setCategories((prev) =>
      prev.map((cat) => (cat.id === updated.id ? updated : cat))
    );
  };

  return (
    <div className="text-white">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-semibold">Categories</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          Add New
        </button>
      </div>

      {/* Category List */}
      <ul className="bg-neutral-900 rounded shadow divide-y divide-gray-800">
        {categories.map((category) => (
          <li
            key={category.id}
            className="flex justify-between items-center p-3 hover:bg-gray-800/50"
          >
            <span>{category.name}</span>
            <button
              onClick={() => openEditModal(category)}
              className="text-blue-400 hover:underline"
            >
              Edit
            </button>
          </li>
        ))}
      </ul>

      {/* Add Modal */}
      {showAddModal && (
        <AddCategoryModal
          onCloseAction={() => setShowAddModal(false)}
          onAddedAction={addCategory}
        />
      )}

      {/* Edit Modal */}
      {showEditModal && selectedCategory && (
        <EditCategoryModal
          category={selectedCategory}
          onCloseAction={closeEditModal}
          onUpdatedAction={updateCategory}
        />
      )}
    </div>
  );
}