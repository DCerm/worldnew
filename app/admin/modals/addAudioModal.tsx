"use client";

import { useState, useRef, FormEvent, ChangeEvent } from "react";

interface Props {
  onClose: () => void;
  onAdd: (audio: {
    id: number;
    title: string;
    description: string;
    url: string;
  }) => void;
}

export function AddAudioModal({ onClose, onAdd }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [audioPreview, setAudioPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  /** Handle file upload and preview */
  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setAudioPreview(URL.createObjectURL(selectedFile));
    }
  };

  /** Handle form submission */
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!file || !audioPreview) return;

    const newAudio = {
      id: Date.now(),
      title,
      description,
      url: audioPreview,
    };

    onAdd(newAudio);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 flex justify-center items-center z-50 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative bg-neutral-900 text-white rounded-xl w-full sm:w-[400px] border border-gray-700 shadow-xl my-10 sm:my-0 h-[100vh] sm:h-auto sm:max-h-[80vh] overflow-y-auto animate-fadeInScale"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          {/* Close Icon */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-gray-400 hover:text-white transition"
          >
            <i className="ri-close-line text-xl"></i>
          </button>

          {/* Header */}
          <h2 className="text-xl font-semibold mb-4">Add New Audio</h2>

          <form onSubmit={handleSubmit}>
            {/* Title */}
            <div className="mb-3">
              <label className="block mb-1 text-sm text-gray-300">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-black border border-gray-700 w-full p-2 rounded text-white"
                required
                onKeyDown={(e) => e.key === "Enter" && handleSubmit(e)}
              />
            </div>

            {/* Description */}
            <div className="mb-3">
              <label className="block mb-1 text-sm text-gray-300">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-black border border-gray-700 w-full p-2 rounded text-white"
                rows={3}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit(e)}
              />
            </div>

            {/* File Upload */}
            <div className="mb-3">
              <label className="block mb-1 text-sm text-gray-300">
                Audio File
              </label>
              <input
                type="file"
                accept="audio/*"
                onChange={onFileChange}
                ref={fileInputRef}
                className="text-gray-400"
                required
              />
            </div>

            {/* Preview */}
            {audioPreview && (
              <div className="mt-3">
                <p className="text-sm text-gray-400 mb-2">Preview:</p>
                <audio src={audioPreview} controls className="w-full rounded" />
              </div>
            )}

            {/* Buttons */}
            <div className="flex justify-end mt-6">
              <button
                type="submit"
                disabled={!title || !file}
                className="flex items-center gap-2 bg-white text-black font-medium rounded-lg px-5 py-2 hover:bg-gray-200 transition disabled:opacity-50"
              >
                <i className="ri-upload-cloud-line text-lg"></i>
                <span>Upload Audio</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}