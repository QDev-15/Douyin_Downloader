"use client";

import { useState } from "react";
import UrlInput from "@/components/downloader/UrlInput";
import LoadingState from "@/components/downloader/LoadingState";
import VideoPreview from "@/components/downloader/VideoPreview";
import AdSlot from "@/components/ads/AdSlot";
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
      <div className="mx-auto flex w-full max-w-6xl flex-1 justify-center gap-4 px-3 py-10 sm:px-6 lg:gap-6 lg:px-8">
        <aside className="sticky top-10 hidden h-fit w-[160px] shrink-0 lg:block xl:w-[240px]">
          <AdSlot placement="sidebarLeft" minHeight={600} label="Quảng cáo" />
        </aside>

        <main className="flex w-full max-w-md flex-1 flex-col items-center gap-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
              Douyin Downloader
            </h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Download Douyin videos easily, không watermark.
            </p>
          </div>

          <AdSlot placement="headerBanner" minHeight={100} />

          <UrlInput onSubmit={handleSubmit} disabled={status === "loading"} />

          {status === "loading" && <LoadingState />}

          {status === "error" && errorMessage && (
            <div className="w-full rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
              {errorMessage}
            </div>
          )}

          {status === "success" && video && <VideoPreview video={video} />}

          <AdSlot placement="inContent" minHeight={250} />

          <AdSlot placement="footer" minHeight={100} className="lg:hidden" />
        </main>

        <aside className="sticky top-10 hidden h-fit w-[160px] shrink-0 lg:block xl:w-[240px]">
          <AdSlot placement="sidebarRight" minHeight={600} label="Quảng cáo" />
        </aside>
      </div>
    </div>
  );
}
