"use client";

import { useState, useEffect } from "react";
import { AddAudioModal } from "./modals/addAudioModal";
import { EditAudioModal } from "./modals/EditAudioModal";
import { DeleteConfirmModal } from "./modals/DeleteConfirmModal";
import { RiAddLine, RiDeleteBinLine, RiMusic2Line } from "react-icons/ri";

interface Audio {
  id: number;
  title: string;
  description: string;
  url?: string;
}

export default function AudioFilesPage() {
  const [audios, setAudios] = useState<Audio[]>([]);
  const demoAudio =
    "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedAudio, setSelectedAudio] = useState<Audio | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  /** Add audio */
  const addAudio = (newAudio: Audio) => {
    setAudios((prev) => [...prev, { ...newAudio, id: Date.now() }]);
  };

  /** Edit audio */
  const openEditModal = (audio: Audio) => {
    setSelectedAudio({ ...audio });
    setShowEditModal(true);
  };

  /** Update edited audio */
  const updateAudio = (updated: Audio) => {
    setAudios((prev) =>
      prev.map((a) => (a.id === updated.id ? updated : a))
    );
  };

  /** Delete audio */
  const openDeleteModal = (id: number) => {
    setDeleteId(id);
    setShowDeleteModal(true);
  };
  const confirmDelete = () => {
    if (deleteId !== null) {
      setAudios((prev) => prev.filter((a) => a.id !== deleteId));
    }
    setShowDeleteModal(false);
  };

  /** Disable scroll when any modal is open */
  useEffect(() => {
    const disableScroll = showAddModal || showEditModal || showDeleteModal;
    document.body.style.overflow = disableScroll ? "hidden" : "";
  }, [showAddModal, showEditModal, showDeleteModal]);

  return (
    <div className="text-white bg-black min-h-screen p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
        <h1 className="text-30px font-semibold">Audio Files</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-white text-black px-4 py-2 rounded font-medium hover:bg-gray-200 transition flex items-center space-x-2"
        >
          <RiAddLine className="text-lg"/>
          <span>Add New</span>
        </button>
      </div>

      {/* Audio Grid */}
      {audios.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {audios.map((audio) => (
            <div
              key={audio.id}
              className="bg-neutral-900 rounded-lg p-4 shadow hover:shadow-lg transition-all duration-200 border border-neutral-800 flex flex-col justify-between"
            >
              <div>
                <h2 className="text-lg font-semibold mb-1 truncate">
                  {audio.title}
                </h2>
                <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                  {audio.description}
                </p>

                {/* Audio Player */}
                <audio
                  src={audio.url || demoAudio}
                  controls
                  className="w-full mt-2 rounded focus:outline-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 mt-4">
                <button
                  onClick={() => openEditModal(audio)}
                  className="text-blue-400 hover:text-blue-500 transition"
                  title="Edit"
                >
                  <i className="ri-edit-2-line text-lg"></i>
                </button>
                <button
                  onClick={() => openDeleteModal(audio.id)}
                  className="text-red-500 hover:text-red-600 transition"
                  title="Delete"
                >
                  <RiDeleteBinLine className="text-lg" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Empty State
        <div className="flex flex-col items-center justify-center mt-20 text-gray-400">
          <RiMusic2Line className="text-5xl mb-3"/>
          <p>No audios found. Click “Add New” to upload one.</p>
        </div>
      )}

      {/* Modals */}
      {showAddModal && (
        <AddAudioModal
          onClose={() => setShowAddModal(false)}
          onAdd={addAudio}
        />
      )}

      {showEditModal && selectedAudio && (
        <EditAudioModal
          audio={selectedAudio}
          onCloseAction={() => setShowEditModal(false)}
          onSaveAction={updateAudio}
        />
      )}

      {showDeleteModal && (
        <DeleteConfirmModal
          onCancelAction={() => setShowDeleteModal(false)}
          onConfirmAction={confirmDelete}
        />
      )}
    </div>
  );
}