"use client";

import { useState } from "react";

import { WordNewMusicTracklist } from "@/app/media/audio/WordNewMusicTracklist";
import type { WordPressMusicTrack } from "@/lib/wordpress";

type Props = {
  tracks: WordPressMusicTrack[];
  details: string;
  credits: string;
  hasPaidCommunityAccess: boolean;
};

const tabs = ["tracklist", "details", "credits"] as const;

export function AlbumDetailTabs({
  tracks,
  details,
  credits,
  hasPaidCommunityAccess,
}: Props) {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("tracklist");

  return (
    <section className="space-y-6">
      <div className="flex gap-8 border-b border-[#ffd1e9]">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`pb-3 text-sm font-black uppercase tracking-[0.18em] transition ${
              activeTab === tab
                ? "border-b-2 border-[#F839A9] text-[#F839A9]"
                : "border-b-2 border-transparent text-stone-500 hover:text-[#F839A9]"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "tracklist" ? (
        tracks.length > 0 ? (
          <WordNewMusicTracklist
            tracks={tracks}
            hasPaidCommunityAccess={hasPaidCommunityAccess}
            showCartButton
            title="Tracklist"
          />
        ) : (
          <div className="rounded-[1.5rem] border border-dashed border-[#ffd1e9] bg-[#fff8fc] p-8 text-sm font-semibold text-stone-500">
            No playable tracks have been added yet.
          </div>
        )
      ) : null}

      {activeTab === "details" ? (
        <div className="rounded-[1.5rem] border border-[#ffd1e9] bg-white p-6 text-sm leading-7 text-stone-700 shadow-sm">
          {details || "No album details have been added yet."}
        </div>
      ) : null}

      {activeTab === "credits" ? (
        <div className="rounded-[1.5rem] border border-[#ffd1e9] bg-white p-6 text-sm leading-7 text-stone-700 shadow-sm">
          {credits || "No artist or collaborator credits have been added yet."}
        </div>
      ) : null}
    </section>
  );
}
