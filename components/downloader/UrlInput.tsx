"use client";

import { FormEvent, useState } from "react";

interface UrlInputProps {
  onSubmit: (url: string) => void;
  disabled?: boolean;
}

export default function UrlInput({ onSubmit, disabled }: UrlInputProps) {
  const [value, setValue] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSubmit(trimmed);
  }

  return (
    <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Dán link Douyin vào đây (v.douyin.com/... hoặc douyin.com/video/...)"
        disabled={disabled}
        className="w-full rounded-xl border border-black/10 bg-white/60 px-4 py-3 text-sm text-neutral-900 shadow-sm outline-none transition focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200 disabled:opacity-60 dark:border-white/15 dark:bg-white/5 dark:text-neutral-100 dark:focus:border-white/30 dark:focus:ring-white/10"
      />
      <button
        type="submit"
        disabled={disabled || value.trim().length === 0}
        className="w-full rounded-xl bg-neutral-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
      >
        {disabled ? "Đang phân tích..." : "Analyze Video"}
      </button>
    </form>
  );
}
