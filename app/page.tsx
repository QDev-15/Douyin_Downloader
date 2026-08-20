"use client";

import { useState } from "react";
import UrlInput from "@/components/downloader/UrlInput";
import LoadingState from "@/components/downloader/LoadingState";
import VideoPreview from "@/components/downloader/VideoPreview";
import { DouyinVideo } from "@/lib/douyin/types";
import { ParseResponse } from "@/types/video";

type Status = "idle" | "loading" | "success" | "error";

export default function Home() {
  const [status, setStatus] = useState<Status>("idle");
  const [video, setVideo] = useState<DouyinVideo | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(url: string) {
    setStatus("loading");
    setErrorMessage(null);
    setVideo(null);

    try {
      const res = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const json: ParseResponse = await res.json();

      if (json.success) {
        setVideo(json.data);
        setStatus("success");
      } else {
        setErrorMessage(json.error.message);
        setStatus("error");
      }
    } catch {
      setErrorMessage("Không thể kết nối tới máy chủ. Vui lòng thử lại.");
      setStatus("error");
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-md flex-1 flex-col items-center gap-8 px-6 py-16">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
            Douyin Downloader
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Download Douyin videos easily, không watermark.
          </p>
        </div>

        <UrlInput onSubmit={handleSubmit} disabled={status === "loading"} />

        {status === "loading" && <LoadingState />}

        {status === "error" && errorMessage && (
          <div className="w-full rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
            {errorMessage}
          </div>
        )}

        {status === "success" && video && <VideoPreview video={video} />}
      </main>
    </div>
  );
}
