"use client";

import { useState, useEffect } from "react";
import { RiAlbumLine, RiChat3Fill, RiChat3Line, RiHome4Line, RiMusic2Line, RiUser2Line } from "react-icons/ri";

type Tab = "home" | "media" | "community";

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  const user = {
    name: "David Smith",
    bio: "Music and light for the world",
    profileImg:
      "https://res.cloudinary.com/dzfqshhzu/image/upload/v1758472075/worldnew/worldnewbanner_qj2qot.webp",
    coverImg:
      "https://res.cloudinary.com/dzfqshhzu/image/upload/v1758472075/worldnew/worldnewbanner_qj2qot.webp",
  };

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);

  const handleResize = () => {
    const mobile = window.innerWidth < 1024; // lg breakpoint
    setIsMobile(mobile);
    if (mobile) setSidebarOpen(false);
  };

  useEffect(() => {
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const uploadCover = () => alert("Upload cover clicked");
  const uploadProfile = () => alert("Upload profile image clicked");

  return (
    <div className="flex lg:-space-x-4 min-h-screen bg-gray-100 text-gray-900">
      {/* Sidebar */}
      <aside
        className={`bg-black text-white flex flex-col rounded-r-2xl fixed lg:relative z-40 h-screen transition-all duration-300 
          ${
            isMobile
              ? sidebarOpen
                ? "w-64 left-0"
                : "w-0 -left-64"
              : sidebarOpen
              ? "w-64"
              : "w-24"
          }`}
      >
        {/* Header + Toggle for desktop */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          {sidebarOpen && !isMobile && (
            <span className="text-xl font-bold hidden lg:block">Dashboard</span>
          )}
          <button
            onClick={toggleSidebar}
            className="text-white text-xl hidden lg:block"
          >
            {sidebarOpen ? (
              <i className="ri-door-open-line"></i>
            ) : (
              <i className="ri-door-closed-line"></i>
            )}
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <a
            href="#"
            className="flex items-center space-x-2 p-2 rounded hover:bg-gray-700"
          >
            <RiHome4Line />
            {(sidebarOpen || isMobile) && <span>Overview</span>}
          </a>
          <a
            href="#"
            className="flex items-center space-x-2 p-2 rounded hover:bg-gray-700"
          >
            <RiMusic2Line />
            {(sidebarOpen || isMobile) && <span>Music + Videos</span>}
          </a>
          <a
            href="#"
            className="flex items-center space-x-2 p-2 rounded hover:bg-gray-700"
          >
            <RiChat3Line />
            {(sidebarOpen || isMobile) && <span>Chat / Forum</span>}
          </a>
          <a
            href="#"
            className="flex items-center space-x-2 p-2 rounded hover:bg-gray-700"
          >
            <RiUser2Line />
            {(sidebarOpen || isMobile) && <span>Profile</span>}
          </a>
          <a
            href="#"
            className="flex items-center space-x-2 p-2 rounded hover:bg-gray-700"
          >
            <RiAlbumLine />
            {(sidebarOpen || isMobile) && <span>Audio Albums</span>}
          </a>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700">
          <button className="w-full flex items-center space-x-2 text-red-500 bg-gray-800 p-2 rounded hover:bg-gray-700">
            <i className="ri-logout-box-line"></i>
            {(sidebarOpen || isMobile) && <span>Log out</span>}
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && isMobile && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={toggleSidebar}
        ></div>
      )}

      {/* Main Content */}
      <div
        className={`flex flex-col flex-1 transition-all duration-300 ${
          isMobile ? "" : sidebarOpen ? "lg:ml-64" : "lg:ml-24"
        }`}
      >
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white shadow">
          <button onClick={toggleSidebar} className="text-2xl">
            <i className="ri-menu-line"></i>
          </button>
          <div className="flex items-center space-x-4">
            <button className="text-2xl">
              <i className="ri-notification-3-line"></i>
            </button>
            <img
              src={user.profileImg}
              alt="profile"
              className="w-8 h-8 rounded-full border"
            />
          </div>
        </header>

        {/* Profile Page Content */}
        <main className="flex-1 max-w-4xl mx-auto mt-8 w-full px-2">
          {/* Cover Section */}
          <div className="relative rounded-lg overflow-hidden shadow">
            <img
              src={user.coverImg}
              alt="cover"
              className="w-full h-60 object-cover"
            />
            <button
              className="absolute top-4 right-4 bg-black/60 text-white px-3 py-1 rounded-md hover:bg-black/80 hidden"
              onClick={uploadCover}
            >
              Upload Cover
            </button>
          </div>

          {/* Profile Section */}
          <div className="relative flex flex-col lg:flex-row items-center lg:items-en justify-between px-4 -mt-12 ">
            <div className="flex flex-col items-center lg:flex-row lg:items-end space-y-4 lg:space-y-0 lg:space-x-4 w-full">
              <div className="relative w-28 h-28">
                <img
                  src={user.profileImg}
                  alt="profile"
                  className="w-28 h-28 rounded-full border-4 border-white object-cover shadow"
                />
                <button
                  className="absolute bottom-0 right-0 bg-black/70 text-xs text-white px-2 py-1 rounded hover:bg-black hidden"
                  onClick={uploadProfile}
                >
                  Upload
                </button>
              </div>
            </div>

            <div className="flex space-x-3 mt-4 lg:mt-12 lg:w-3/4 justify-end">
              <button className="bg-black text-white px-4 py-2 rounded-lg shadow hover:bg-gray-800">
                Upgrade
              </button>
              <button className="bg-black text-white px-4 py-2 rounded-lg shadow hover:bg-gray-700">
                Gift Membership 🎁
              </button>
              <button className="bg-black text-white px-4 py-2 rounded-lg shadow hover:bg-gray-600">
                <RiChat3Fill className="" />
              </button>
            </div>
          </div>

          <div className="text-center mt-2 lg:text-left">
            <h2 className="text-2xl font-bold">{user.name}</h2>
            <p className="text-gray-600">{user.bio}</p>
          </div>

          {/* Tabs */}
          <div className="mt-10 border-b space-x-2 border-gray-300">
            <nav className="flex justify-between">
              <button
                className={`w-1/3 pb-3 font-semibold transition ${
                  activeTab === "home"
                    ? "border-b-2 border-black text-black"
                    : "text-gray-600 hover:text-black hover:border-b-2 hover:border-gray-400"
                }`}
                onClick={() => setActiveTab("home")}
              >
                Home
              </button>
              <button
                className={`w-1/3 pb-3 font-semibold transition ${
                  activeTab === "media"
                    ? "border-b-2 border-black text-black"
                    : "text-gray-600 hover:text-black hover:border-b-2 hover:border-gray-400"
                }`}
                onClick={() => setActiveTab("media")}
              >
                Media
              </button>
              <button
                className={`w-1/3 pb-3 font-semibold transition ${
                  activeTab === "community"
                    ? "border-b-2 border-black text-black"
                    : "text-gray-600 hover:text-black hover:border-b-2 hover:border-gray-400"
                }`}
                onClick={() => setActiveTab("community")}
              >
                Community
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-8">
            {activeTab === "home" && (
              <div>
                <h3 className="text-xl font-bold">Welcome to the Home Tab!</h3>
                <p className="text-gray-600">
                  Overview of latest updates and activity.
                </p>
              </div>
            )}
            {activeTab === "media" && (
              <div>
                <h3 className="text-xl font-bold">Media Library</h3>
                <p className="text-gray-600">
                  Music, videos, and exclusive drops.
                </p>
              </div>
            )}
            {activeTab === "community" && (
              <div>
                <h3 className="text-xl font-bold">Community</h3>
                <p className="text-gray-600">Chat, forum, and fan discussions.</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}