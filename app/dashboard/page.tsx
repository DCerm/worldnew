"use client";

import Link from "next/link";
import { useState } from "react";
import { RiChat3Fill } from "react-icons/ri";

type Tab = "home" | "media" | "community";

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<Tab>("home");

  const user = {
    name: "David Smith",
    bio: "Music and light for the world",
    profileImg:
      "https://res.cloudinary.com/dzfqshhzu/image/upload/v1758472075/worldnew/worldnewbanner_qj2qot.webp",
    coverImg:
      "https://res.cloudinary.com/dzfqshhzu/image/upload/v1758472075/worldnew/worldnewbanner_qj2qot.webp",
  };



  return (
        <>
        {/* Profile Page Content */}
        <main className="flex-1 max-w-4xl mx-auto mt-8 w-full px-2">
            {/* Cover Section */}
            <div className="relative rounded-lg overflow-hidden shadow">
                <img
                src={user.coverImg}
                alt="cover"
                className="w-full h-60 object-cover"
                />
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
                <Link href="/media">
                <button
                    className={` pb-3 font-semibold transition ${
                    activeTab === "media"
                        ? "border-b-2 border-black text-black"
                        : "text-gray-600 hover:text-black hover:border-b-2 hover:border-gray-400"
                    }`}
                >
                    Music + Videos
                </button>
                </Link>
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
    </>
  );
}