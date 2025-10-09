'use client';

import Link from 'next/link';
//import { useState } from 'react';
import { RiArrowLeftLine } from 'react-icons/ri';

export default function DashboardPage() {

  const videoCategories = [
    {
      name: 'Categories',
      items: [
        { id: 1, title: 'Singles', poster: 'https://img.youtube.com/vi/ysz5S6PUM-U/hqdefault.jpg' },
        { id: 2, title: 'Studio Performances', poster: 'https://img.youtube.com/vi/ScMzIvxBSi4/hqdefault.jpg' },
        { id: 3, title: 'Band', poster: 'https://img.youtube.com/vi/tgbNymZ7vqY/hqdefault.jpg' },
        { id: 4, title: 'Documentaries', poster: 'https://img.youtube.com/vi/9bZkp7q19f0/hqdefault.jpg' },
      ],
    },
    {
      name: 'Band',
      items: [
        { id: 1, title: 'Band 1', poster: 'https://img.youtube.com/vi/3fumBcKC6RE/hqdefault.jpg' },
        { id: 2, title: 'Band 2', poster: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg' },
        { id: 3, title: 'Studio 1', poster: 'https://img.youtube.com/vi/6lt2JfJdGSY/hqdefault.jpg' },
        { id: 4, title: 'Studio 2', poster: 'https://img.youtube.com/vi/5NV6Rdv1a3I/hqdefault.jpg' },
      ],
    },
    {
      name: 'Studio Performances',
      items: [
        { id: 1, title: 'Studio 1', poster: 'https://img.youtube.com/vi/6lt2JfJdGSY/hqdefault.jpg' },
        { id: 2, title: 'Studio 2', poster: 'https://img.youtube.com/vi/5NV6Rdv1a3I/hqdefault.jpg' },
        { id: 3, title: 'Studio 3', poster: 'https://img.youtube.com/vi/6lt2JfJdGSY/hqdefault.jpg' },
        { id: 4, title: 'Studio 4', poster: 'https://img.youtube.com/vi/5NV6Rdv1a3I/hqdefault.jpg' },
        { id: 5, title: 'Studio 5', poster: 'https://img.youtube.com/vi/3fumBcKC6RE/hqdefault.jpg' },
        { id: 6, title: 'Studio 6', poster: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg' },
      ],
    },
    {
      name: 'Singles',
      items: [
        { id: 1, title: 'Single 1', poster: 'https://img.youtube.com/vi/kJQP7kiw5Fk/hqdefault.jpg' },
        { id: 2, title: 'Single 2', poster: 'https://img.youtube.com/vi/OPf0YbXqDm0/hqdefault.jpg' },
      ],
    },
    {
      name: 'Documentaries',
      items: [
        { id: 1, title: 'Doc 1', poster: 'https://img.youtube.com/vi/9bZkp7q19f0/hqdefault.jpg' },
        { id: 2, title: 'Doc 2', poster: 'https://img.youtube.com/vi/L_jWHffIx5E/hqdefault.jpg' },
      ],
    },
  ];

  const audioTracks = [
    { poster: 'https://picsum.photos/100/100?1', title: 'Song One', desc: 'Cool vibes with smooth flow' },
    { poster: 'https://picsum.photos/100/100?2', title: 'Song Two', desc: 'Upbeat jam for the weekend' },
    { poster: 'https://picsum.photos/100/100?3', title: 'Song Three', desc: 'Chill session vibes' },
    { poster: 'https://picsum.photos/100/100?4', title: 'Song Four', desc: 'Heavy beats for gym' },
    { poster: 'https://picsum.photos/100/100?5', title: 'Song Five', desc: 'Soulful R&B experience' },
    { poster: 'https://picsum.photos/100/100?6', title: 'Song Six', desc: 'Extra track (hidden in preview)' },
  ];

  return (
        <div className="relative w-full bg-black text-white overflow-hidden">
        {/* Sticky Topbar */}
        <div className="sticky top-0 z-30 bg-black/70 backdrop-blur-md px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex gap-1">
                <RiArrowLeftLine className="text-xl mt-0.5" />
                <button className="text-white hover:text-gray-300 font-bold text-lg">Dashboard</button>
            </Link>
            </div>
            <nav className="flex gap-4 text-sm">
            <Link href="/dashboard" className="hover:text-red-500">
                Home
            </Link>
            <Link href="/music" className="hover:text-red-500">
                All Music
            </Link>
            </nav>
        </div>

        {/* Hero Video Section */}
        <div className="relative w-full h-[90vh] overflow-hidden">
            <video
            autoPlay
            muted
            loop
            playsInline
            className="absolute top-0 left-0 w-full h-full object-cover z-0"
            >
                <source src="https://www.w3schools.com/html/mov_bbb.mp4" type="video/mp4" />
            </video>
            <div className="absolute inset-0 bg-black/50 z-10 flex flex-col justify-center px-8">
            <h1 className="text-4xl md:text-6xl font-bold mb-3">Featured Music Video</h1>
            <p className="max-w-lg text-base mb-4">
                Experience the hottest music video of the moment.
            </p>
            <div className="flex gap-4">
                <button className="bg-white text-black px-6 py-2 rounded-lg font-bold hover:bg-gray-200">
                ▶ Play
                </button>
                <button className="bg-gray-600/80 px-6 py-2 rounded-lg font-bold hover:bg-gray-500">
                More Info
                </button>
            </div>
            </div>
        </div>

        {/* 2 Column Layout */}
        <div className="grid grid-cols-1 lg:flex gap-6 px-6 py-12 sticky top-0">
            {/* Left 2/3: Video Categories */}
            <div className="lg:w-2/3 space-y-10">
            {videoCategories.map((category) => (
                <div key={category.name}>
                <h2 className="text-xl font-bold mb-3">{category.name}</h2>
                <div className="flex overflow-x-auto space-x-6 pb-2 snap-x snap-mandatory scrollbar-hide">
                    {category.items.map((video) => (
                    <div
                        key={video.id}
                        className="snap-start flex-shrink-0 w-[220px] h-[300px] bg-gray-700 rounded-lg overflow-hidden cursor-pointer hover:scale-105 transition-transform relative"
                    >
                        <img
                        src={video.poster}
                        alt={video.title}
                        className="w-full h-full object-cover"
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-sm p-1 text-center">
                        {video.title}
                        </div>
                    </div>
                    ))}
                </div>
                </div>
            ))}
            </div>

            {/* Right 1/3: Audio Tracks */}
            <div className="lg:w-1/3 space-y-6 sticky lg:top-6">
            <h2 className="text-xl font-bold mb-4">Top Tracks</h2>
            {audioTracks.slice(0, 5).map((track, idx) => (
                <div
                key={idx}
                className="flex gap-4 items-center bg-gray-900 rounded-lg p-3 hover:bg-gray-800"
                >
                <img
                    src={track.poster}
                    alt={track.title}
                    className="w-16 h-16 rounded object-cover"
                />
                <div>
                    <h3 className="font-semibold">{track.title}</h3>
                    <p className="text-sm text-gray-400">{track.desc}</p>
                </div>
                </div>
            ))}
            <Link href="/dashboard/music">
                <button className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded-lg mt-4">
                View All Music →
                </button>
            </Link>
            </div>
        </div>
        </div>
  );
}

/* Hide scrollbars */
if (typeof window !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = `
    .scrollbar-hide::-webkit-scrollbar { display: none; }
    .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
  `;
  document.head.appendChild(style);
}