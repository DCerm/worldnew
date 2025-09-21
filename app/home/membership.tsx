// components/Membership.tsx
import React from "react";

export default function Membership() {
  return (
    <div className="p-2 w-full md:w-4/5 mx-auto rounded-xl relative mt-6 lg:mt-8">
      {/* Title */}
      <h2 className="text-25px lg:text-30px font-bold mb-6">Select a Membership</h2>

      {/* Membership Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6  w-full">
        {/* Day Pass */}
        <div className="border rounded-xl flex flex-col justify-between p-6 shadow-sm hover:shadow-md hover:border-2 transition">
          <div>
            <h3 className="text-lg font-semibold mb-2">Day Pass</h3>
            <p className="text-sm mb-4">Includes access to:</p>
            <ul className="">
              <li>exclusive songs</li>
              <li>my entire demo archive</li>
              <li>
                exclusive videos (spiritual content, how i done it content,
                Q&amp;A&apos;s, BTS &amp; more)
              </li>
              <li>
                chat forums (spirituality, mental health, money, gaming &amp;
                more)
              </li>
              <li>documentation of the coming of the World. New.</li>
              <li>
                live streams &amp; video group calls (life, spirituality &amp;
                health discussions, group gaming sessions etc.)
              </li>
              <li>find/network with like minded souls</li>
              <li>real community, real people.</li>
            </ul>
          </div>
          <button className="bg-[#001f3f] w-full text-white rounded-lg p-2 font-bold text-lg mt-4">
            Coming soon
          </button>
        </div>

        {/* Pro Monthly */}
        <div className="border flex flex-col justify-between rounded-xl p-6 shadow-sm hover:shadow-md hover:border-2 transition">
          <div>
            <h3 className="text-lg font-semibold mb-2">Pro (Monthly)</h3>
            <p className="text-sm mb-4">Includes access to:</p>
            <ul className="text-sm">
              <li>exclusive songs</li>
              <li>my entire demo archive</li>
              <li>
                exclusive videos (spiritual content, how i done it content,
                Q&amp;A&apos;s, BTS &amp; more)
              </li>
              <li>
                chat forums (spirituality, mental health, money, gaming &amp;
                more)
              </li>
              <li>documentation of the coming of the World. New.</li>
              <li>
                live streams &amp; video group calls (life, spirituality &amp;
                health discussions, group gaming sessions etc.)
              </li>
              <li>find/network with like minded souls</li>
              <li>real community, real people.</li>
            </ul>
          </div>
          <button className="bg-[#001f3f] w-full text-white rounded-lg p-2 font-bold text-lg mt-4">
            Coming soon
          </button>
        </div>

        {/* Pro Annual */}
        <div className="border flex flex-col justify-between rounded-xl p-6 shadow-sm hover:shadow-md hover:border-2 transition">
          <div>
            <h3 className="text-lg font-semibold mb-2">Pro (Annual)</h3>
            <p className="text-sm">
              Includes access to everything within the day pass and pro
              (monthly) but <span className="font-bold">Save 20%</span> by
              getting a yearly membership.
            </p>
          </div>
          <button className="bg-[#001f3f] w-full text-white rounded-lg p-2 font-bold text-lg mt-4">
            Coming soon
          </button>
        </div>
      </div>

      {/* Spotify Embed */}
      <div className="w-full mt-6 lg:mt-8">
        <iframe
          data-testid="embed-iframe"
          className="mx-auto w-full mt-5"
          style={{ borderRadius: "12px" }}
          src="https://open.spotify.com/embed/artist/4OaI7yY0CgtdGBBdjEzqD4?utm_source=generator"
          width="80%"
          height="352"
          frameBorder="0"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
        ></iframe>
      </div>
    </div>
  );
}
