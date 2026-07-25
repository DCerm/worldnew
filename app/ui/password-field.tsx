"use client";

import { useState } from "react";

type PasswordFieldProps = {
  name: string;
  placeholder?: string;
  className?: string;
  autoComplete?: string;
  required?: boolean;
};

export default function PasswordField({
  name,
  placeholder = "Password",
  className = "",
  autoComplete,
  required = false,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        name={name}
        type={visible ? "text" : "password"}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        className={`${className} pr-20`}
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-stone-600 px-3 py-1 text-xs font-semibold text-stone-300 hover:border-[#F839A9] hover:text-white"
      >
        {visible ? "Hide" : "Show"}
      </button>
    </div>
  );
}
