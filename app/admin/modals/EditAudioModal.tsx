"use client";

import { useState, useEffect, FormEvent, ChangeEvent } from "react";
import { RiCloseLine, RiSave3Line } from "react-icons/ri";

interface AudioFile {
  id: number;
  title: string;
  description: string;
  url?: string;
}

interface EditAudioModalProps {
  audio: AudioFile;
  onCloseAction: () => void;
  onSaveAction: (updated: AudioFile) => void;
}

export function EditAudioModal({ audio, onCloseAction, onSaveAction }: EditAudioModalProps) {
  const [form, setForm] = useState<AudioFile>({ ...audio });
  const [file, setFile] = useState<File | null>(null);
  const [audioPreview, setAudioPreview] = useState<string | null>(audio.url || null);

  // Watch for prop changes
  useEffect(() => {
    setForm({ ...audio });
    setAudioPreview(audio.url || null);
  }, [audio]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setAudioPreview(URL.createObjectURL(selected));
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const updated: AudioFile = {
      ...form,
      url: file ? URL.createObjectURL(file) : form.url,
    };
    onSaveAction(updated);
    onCloseAction();
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 flex justify-center items-center z-50"
      onClick={onCloseAction}
    >
      <div
        className="relative bg-neutral-900 text-white rounded-xl w-full sm:w-[400px] border border-gray-700 shadow-xl h-[100vh] sm:max-h-[80vh] sm:h-auto overflow-y-auto animate-fadeInScale"
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

          <h2 className="text-xl font-semibold mb-4">Edit Audio</h2>

          <form onSubmit={handleSubmit}>
            {/* Title */}
            <div className="mb-3">
              <label className="block mb-1 text-sm text-gray-300">Title</label>
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
              <label className="block mb-1 text-sm text-gray-300">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="bg-black border border-gray-700 w-full p-2 rounded text-white"
                rows={3}
              />
            </div>

            {/* Replace Audio File */}
            <div className="mb-3">
              <label className="block mb-1 text-sm text-gray-300">
                Replace File (optional)
              </label>
              <input
                type="file"
                accept="audio/*"
                onChange={handleFileChange}
                className="text-gray-400"
              />
            </div>

            {/* Preview */}
            {audioPreview && (
              <div className="mt-3">
                <p className="text-sm text-gray-400 mb-2">Preview:</p>
                <audio src={audioPreview} controls className="w-full rounded" />
              </div>
            )}

            {/* Save Button */}
            <div className="flex justify-end mt-6">
              <button
                type="submit"
                className="flex items-center gap-2 bg-white text-black font-medium rounded-lg px-5 py-2 hover:bg-gray-200 transition"
              >
                <RiSave3Line className="text-lg" />
                <span>Save Changes</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Scoped CSS via Tailwind animation */}
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