"use client";

import { useState, ChangeEvent, FormEvent } from "react";
import { RiCloseLine, RiUploadCloudLine } from "react-icons/ri";

interface AddVideoModalProps {
  categories: string[];
  onCloseAction: () => void;
  onAddAction: (video: {
    title: string;
    description: string;
    category: string;
    url: string;
  }) => void;
}

export default function AddVideoModal({ categories, onCloseAction, onAddAction }: AddVideoModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(categories[0] || "");
  const [file, setFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);

  /** Handle file upload and preview */
  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setVideoPreview(URL.createObjectURL(selected));
    }
  };

  /** Submit video data to parent */
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!file) {
      alert("Please select a video file.");
      return;
    }

    const newVideo = {
      title,
      description,
      category,
      url: URL.createObjectURL(file),
    };

    onAddAction(newVideo);
    onCloseAction();
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 flex justify-center items-center z-50 overflow-y-auto"
      onClick={(e) => e.target === e.currentTarget && onCloseAction()}
    >
      <div
        className="relative bg-neutral-900 text-white rounded-xl w-full sm:w-[400px] border border-gray-700 shadow-xl my-10 sm:my-0 h-[100vh] sm:h-auto sm:max-h-[80vh] overflow-y-auto animate-fadeInScale"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          {/* Close Icon */}
          <button
            onClick={onCloseAction}
            className="absolute top-3 right-3 text-gray-400 hover:text-white transition"
          >
            <RiCloseLine className="text-xl" />
          </button>

          {/* Header */}
          <h2 className="text-xl font-semibold mb-4">Add New Video</h2>

          <form onSubmit={submit}>
            {/* Title */}
            <div className="mb-3">
              <label className="block mb-1 text-gray-300">Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                type="text"
                className="bg-black border border-gray-700 w-full p-2 rounded text-white"
                required
              />
            </div>

            {/* Description */}
            <div className="mb-3">
              <label className="block mb-1 text-gray-300">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-black border border-gray-700 w-full p-2 rounded text-white"
                rows={3}
              ></textarea>
            </div>

            {/* Category */}
            <div className="mb-3">
              <label className="block mb-1 text-gray-300">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="bg-black border border-gray-700 w-full p-2 rounded text-white"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* File Upload */}
            <div className="mb-3">
              <label className="block mb-1 text-gray-300">Video File</label>
              <input
                type="file"
                accept="video/*"
                onChange={onFileChange}
                className="text-gray-400"
                required
              />
            </div>

            {/* Preview */}
            {videoPreview && (
              <div className="mt-3">
                <p className="text-sm text-gray-400 mb-2">Preview:</p>
                <video src={videoPreview} controls className="w-full rounded"></video>
              </div>
            )}

            {/* Buttons */}
            <div className="flex justify-end mt-6">
              <button
                type="submit"
                className="flex items-center gap-2 bg-white text-black font-medium rounded-lg px-5 py-2 hover:bg-gray-200 transition"
              >
                <RiUploadCloudLine className="text-lg" />
                <span>Upload Video</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Inline styles for animation & scrollbar */}
      <style jsx>{`
        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: scale(0.96);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fadeInScale {
          animation: fadeInScale 0.2s ease;
        }

        .bg-neutral-900::-webkit-scrollbar {
          width: 6px;
        }
        .bg-neutral-900::-webkit-scrollbar-thumb {
          background: #555;
          border-radius: 10px;
        }
        .bg-neutral-900::-webkit-scrollbar-thumb:hover {
          background: #777;
        }
      `}</style>
    </div>
  );
}
