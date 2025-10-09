"use client";

import { useState, useEffect } from "react";
import { RiAddLine, RiVideoLine, RiEdit2Line, RiDeleteBinLine } from "react-icons/ri";

// These would be imported React components:
import AddVideoModal from "../modals/AddVideoModal";
import EditVideoModal from "../modals/EditVideoModal";
import { DeleteConfirmModal } from "../modals/DeleteConfirmModal";

interface Video {
  id: number;
  title: string;
  description: string;
  category: string;
  url?: string;
}

export default function VideosPage() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const [categories] = useState(["Music", "Education", "Entertainment"]);
  const [videos, setVideos] = useState<Video[]>([]);

  /** Add new video */
  const addVideo = (newVideo: Omit<Video, "id">) => {
    setVideos((prev) => [...prev, { ...newVideo, id: Date.now() }]);
  };

  /** Edit video */
  const openEditModal = (video: Video) => {
    setSelectedVideo({ ...video });
    setShowEditModal(true);
  };

  /** Update video */
  const updateVideo = (updated: Video) => {
    setVideos((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
  };

  /** Delete flow */
  const openDeleteModal = (id: number) => {
    setDeleteId(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (deleteId !== null) {
      setVideos((prev) => prev.filter((v) => v.id !== deleteId));
    }
    setShowDeleteModal(false);
  };

  /** Disable scroll when modal open */
  useEffect(() => {
    const disableScroll = showAddModal || showEditModal || showDeleteModal;
    document.body.style.overflow = disableScroll ? "hidden" : "";
  }, [showAddModal, showEditModal, showDeleteModal]);

  return (
    <div className="text-white bg-black min-h-screen p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-30px font-semibold">Videos</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-white text-black px-4 py-2 rounded font-medium hover:bg-gray-200 transition flex items-center space-x-2"
        >
          <RiAddLine className="text-lg" />
          <span>Add New</span>
        </button>
      </div>

      {/* Video Grid */}
      {videos.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {videos.map((video) => (
            <div
              key={video.id}
              className="bg-neutral-900 p-4 rounded-lg border border-neutral-800 shadow hover:shadow-lg transition"
            >
              <h2 className="text-lg font-semibold mb-1 truncate">{video.title}</h2>
              <p className="text-gray-400 text-sm mb-2 line-clamp-2">
                {video.description}
              </p>

              {video.url && (
                <video
                  src={video.url}
                  controls
                  className="w-full rounded mt-2"
                ></video>
              )}

              <div className="flex justify-between items-center mt-3">
                <span className="text-xs text-gray-400">{video.category}</span>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => openEditModal(video)}
                    className="text-blue-400 hover:text-blue-500 transition"
                    title="Edit"
                  >
                    <RiEdit2Line className="text-lg" />
                  </button>

                  <button
                    onClick={() => openDeleteModal(video.id)}
                    className="text-red-500 hover:text-red-600 transition"
                    title="Delete"
                  >
                    <RiDeleteBinLine className="text-lg" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Empty State
        <div className="flex flex-col items-center justify-center mt-20 text-gray-400">
          <RiVideoLine className="text-5xl mb-3" />
          <p>No videos found. Click “Add New” to upload one.</p>
        </div>
      )}

      {/* Modals */}
      {showAddModal && (
        <AddVideoModal
          categories={categories}
          onCloseAction={() => setShowAddModal(false)}
          onAddAction={addVideo}
        />
      )}

      {showEditModal && selectedVideo && (
        <EditVideoModal
          video={selectedVideo}
          categories={categories}
          onCloseAction={() => setShowEditModal(false)}
          onSaveAction={updateVideo}
        />
      )}

      {showDeleteModal && (
        <DeleteConfirmModal
          onCancelAction={() => setShowDeleteModal(false)}
          onConfirmAction={confirmDelete}
        />
      )}

      {/* Local CSS (animation + line clamp) */}
      <style jsx>{`
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}