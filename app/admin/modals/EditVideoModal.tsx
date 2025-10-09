"use client";

import { useState, useEffect, FormEvent, ChangeEvent } from "react";

interface Video {
  id: number;
  title: string;
  description: string;
  category: string;
  url?: string;
}

interface EditVideoModalProps {
  video: Video;
  categories: string[];
  onCloseAction: () => void;
  onSaveAction: (updated: Video) => void;
}

export default function EditVideoModal({
  video,
  categories,
  onCloseAction,
  onSaveAction,
}: EditVideoModalProps) {
  const [form, setForm] = useState<Video>({ ...video });
  const [file, setFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(video.url || null);

  // Watch for video prop change (same as Vue watch)
  useEffect(() => {
    setForm({ ...video });
    setVideoPreview(video.url || null);
  }, [video]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setVideoPreview(URL.createObjectURL(selected));
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    const updated: Video = {
      ...form,
      url: file ? URL.createObjectURL(file) : form.url,
    };

    onSaveAction(updated);
    onCloseAction();
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 flex justify-center items-center z-50"
      onClick={(e) => e.target === e.currentTarget && onCloseAction()}
    >
      <div
        className="relative bg-neutral-900 text-white rounded-xl w-full sm:w-[400px] border border-gray-700 shadow-xl h-[100vh] sm:max-h-[80vh] sm:h-auto overflow-y-auto animate-[fadeInScale_0.2s_ease]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 relative">
          {/* Close Button */}
          <button
            onClick={onCloseAction}
            className="absolute top-3 right-3 text-gray-400 hover:text-white transition"
            title="Close"
          >
            <i className="ri-close-line text-xl"></i>
          </button>

          {/* Header */}
          <h2 className="text-xl font-semibold mb-4">Edit Video</h2>

          <form onSubmit={handleSubmit}>
            {/* Title */}
            <div className="mb-3">
              <label className="block mb-1 text-gray-300">Title</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="bg-black border border-gray-700 w-full p-2 rounded text-white"
                required
              />
            </div>

            {/* Description */}
            <div className="mb-3">
              <label className="block mb-1 text-gray-300">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="bg-black border border-gray-700 w-full p-2 rounded text-white"
                rows={3}
              />
            </div>

            {/* Category */}
            <div className="mb-3">
              <label className="block mb-1 text-gray-300">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="bg-black border border-gray-700 w-full p-2 rounded text-white"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Replace File */}
            <div className="mb-3">
              <label className="block mb-1 text-gray-300">Replace File (optional)</label>
              <input
                type="file"
                accept="video/*"
                onChange={handleFileChange}
                className="text-gray-400"
              />
            </div>

            {/* Preview */}
            {videoPreview && (
              <div className="mt-3">
                <p className="text-sm text-gray-400 mb-2">Preview:</p>
                <video src={videoPreview} controls className="w-full rounded h-60" />
              </div>
            )}

            {/* Buttons */}
            <div className="flex justify-end mt-6">
              <button
                type="submit"
                className="flex items-center gap-2 bg-white text-black font-medium rounded-lg px-5 py-2 hover:bg-gray-200 transition"
              >
                <i className="ri-save-3-line text-lg"></i>
                <span>Save Changes</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Animation keyframes */}
      <style jsx>{`
        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: scale(0.97);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        ::-webkit-scrollbar {
          width: 6px;
        }
        ::-webkit-scrollbar-thumb {
          background: #555;
          border-radius: 10px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #777;
        }
      `}</style>
    </div>
  );
}