"use client";

interface DeleteConfirmModalProps {
  title?: string;
  message?: string;
  onCancelAction: () => void;
  onConfirmAction: () => void;
}

export function DeleteConfirmModal({
  title = "Delete Video",
  message = "Are you sure you want to delete this video? This action cannot be undone.",
  onCancelAction,
  onConfirmAction,
}: DeleteConfirmModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-neutral-900 p-6 rounded-xl shadow-lg border border-neutral-800 w-[90%] max-w-sm text-center animate-fadeInScale">
        <i className="ri-delete-bin-6-line text-red-500 text-5xl mb-3"></i>
        <h2 className="text-lg font-semibold mb-2 text-white">{title}</h2>
        <p className="text-gray-400 mb-5 text-sm">{message}</p>

        <div className="flex justify-center space-x-4">
          <button
            onClick={onCancelAction}
            className="px-4 py-2 rounded bg-neutral-800 text-gray-300 hover:bg-neutral-700 transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirmAction}
            className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 transition"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}