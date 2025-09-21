// components/GetNotified.tsx
"use client";

import React, { useState } from "react";

export default function GetNotified() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const canSend = name.trim().length > 0 && /\S+@\S+\.\S+/.test(email);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSend) return;
    // Replace with real API call
    alert(`Thanks ${name}! We'll notify you at ${email}`);
    setName("");
    setEmail("");
  }

  return (
    <div className="p-2 w-full md:w-4/5 mx-auto rounded-xl relative mt-6 lg:mt-8">
      {/* Get Notified */}
      <div className="w-full">
        <h3 className="text-25px lg:text-30px text-[#001f3f] font-bold mb-4">Get Notified</h3>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col sm:flex-row items-center gap-4"
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label="Name"
            placeholder="Name"
            className="flex-1 border w-full border-[#001f3f] rounded px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-200"
          />

          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-label="Email"
            type="email"
            placeholder="Email"
            className="flex-1 border w-full rounded border-[#001f3f] px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-200"
          />

          <button
            type="submit"
            className="bg-[#001f3f] text-white px-12 py-2 rounded w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
