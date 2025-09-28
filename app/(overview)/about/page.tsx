// app/about/page.tsx (Next.js 13+ App Router example)
"use client";

import React from "react";
import { H2, H3 } from "@/app/ui/headings";
import { RiGiftLine, RiMessage3Line, RiMusicLine, RiShakeHandsFill } from "react-icons/ri";

export default function AboutPage() {
  return (
    <div className="bg-gray-200 p-0 m-0">
      {/* Hero Section */}
      <section className="relative w-full p-2 min-h-[93vh] flex items-center justify-center bg-abouthero bg-bottom bg-cover mt-0">        

        {/* Hero Content */}
        <div className="relative z-10 text-center px-4 p-2 w-full md:w-4/5 mx-auto">
          <h1 className="text-4xl sm:text-6xl font-extrabold mb-6 text-white">
            About World. New.
          </h1>
          <p className="text-base sm:text-lg text-gray-200 leading-relaxed lg:px-10p">
            World. New. isn&apos;t just a fan club — it&apos;s a home for people who love
            music, connection, and being part of something bigger. Created by{" "}
            <span className="font-bold text-blue-400">Franke</span>, this
            community is where fans and music truly come together.
          </p>
        </div>
      </section>

      {/* What We Offer */}
      <section className="p-2 w-full bg-gray-300 md:w-4/5 mx-auto mt-16 px-6 py-16 space-y-20 rounded-lg">
        <div className="text-center space-y-4">
            <H3 className="" text="What We Offer" />
         
            <p className="text-gray-600 max-w-2xl mx-auto text-lg">
                Being part of{" "}
                <span className="font-semibold text-blue-600">World. New.</span>{" "}
                means more than music — it&apos;s about community, exclusive access, and
                unforgettable experiences.
            </p>
        </div>

        {/* Features Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1 */}
          <div className="bg-white rounded-xl shadow-md p-6 text-center hover:shadow-lg transition">
            <div className="flex justify-center mb-3">
              <RiMusicLine className="lg:text-2xl text-indigo-600"/>
            </div>
            <h3 className="text-xl font-bold mb-2 text-gray-900">
              Exclusive Music
            </h3>
            <p className="text-gray-600">
              Hear unreleased tracks before anyone else.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-gray-50 rounded-xl shadow-md p-6 text-center hover:shadow-lg transition">
            <div className="flex justify-center mb-3">
              <RiMessage3Line className="lg:text-2xl text-blue-500" />
            </div>
            <h3 className="text-xl font-bold mb-2 text-gray-900">
              Have Your Say
            </h3>
            <p className="text-gray-600">
              Vote in polls, comment, and shape the drops.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-white rounded-xl shadow-md p-6 text-center hover:shadow-lg transition">
            <div className="flex justify-center mb-3">
              <RiGiftLine className="lg:text-2xl text-green-600" />
            </div>
            <h3 className="text-xl font-bold mb-2 text-gray-900">Giveaways</h3>
            <p className="text-gray-600">
              Win exclusive merch and show tickets.
            </p>
          </div>

          {/* Card 4 */}
          <div className="bg-gray-50 rounded-xl shadow-md p-6 text-center hover:shadow-lg transition">
            <div className="flex justify-center mb-3">
              <RiShakeHandsFill className="text-2xl text-pink-500" />
            </div>
            <h3 className="text-xl font-bold mb-2 text-gray-900">
              Real Community
            </h3>
            <p className="text-gray-600">
              Meet fans worldwide who share your passion.
            </p>
          </div>
        </div>
      </section>

      {/* Membership & Why Join */}
      <section className="p-0 w-full md:w-4/5 mx-auto mt-1  py-12 space-y-20">
        {/* Membership Section */}
        <div className="bg-gray-50 rounded-2xl p-10 space-y-6 shadow-md">
            <H3 className="text-center" text="Free & Paid Memberships" />
         
          <p className="text-gray-600 text-center max-w-2xl mx-auto">
            Free Members stay in the loop with updates and discussions. Paid
            Members unlock extras: exclusive tracks, behind-the-scenes, polls,
            and giveaways.
          </p>

          <div className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <div className="bg-white rounded-xl shadow-md p-6 text-center">
              <h3 className="font-bold text-xl mb-2 text-gray-900">Free</h3>
              <p className="text-gray-600">
                Stay updated with sneak peeks & discussions.
              </p>
            </div>
            <div className="bg-dark text-white rounded-xl shadow-md p-6 text-center">
              <h3 className="font-bold text-xl mb-2">Paid</h3>
              <p>
                Unlock exclusive tracks, behind-the-scenes, polls & giveaways.
              </p>
            </div>
          </div>
        </div>

        {/* Why Join */}
        <div className="space-y-6 text-center">
            <H2 className="text-center" text="Why Join?" />
          
          <p className="text-base sm:text-lg text-gray-600 max-w-3xl mx-auto">
            Because music is more fun when you&apos;re part of it. In World. New.,
            you&apos;re not just listening — you&apos;re shaping the journey.
          </p>
          <p className="text-xl font-semibold text-blue-600">
            ✨ Welcome to World. New. — where music meets community.
          </p>
        </div>

        {/* Newsletter CTA */}
        <div className="bg-gradient-to-r from-gray-900 via-gray-700 to-gray-500 text-black rounded-2xl p-10 sm:p-14 text-center shadow-md">
            <H2 className="text-white mb-6" text="Stay Inspired. Join Our Newsletter" />
          
          <p className="mb-6 text-base sm:text-lg text-gray-50 max-w-xl mx-auto">
            Be the first to discover exclusive content, giveaways, and updates.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <input
              type="email"
              placeholder="Enter your email"
              className="px-4 py-3 rounded-lg border-2 border-gray-600 text-gray-900 w-full sm:w-72"
            />
            <button className="bg-black text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-800">
              Subscribe
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}