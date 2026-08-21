"use client";

import { useMemo, useState } from "react";
import { DouyinVideo } from "@/lib/douyin/types";

interface DownloadButtonProps {
  video: DouyinVideo;
}

function buildDownloadUrl(videoUrl: string, title: string): string {
  const params = new URLSearchParams({ url: videoUrl, title });
  return `/api/download?${params.toString()}`;
}

function filenameFromContentDisposition(header: string | null, fallback: string): string {
  if (!header) return fallback;
  const utf8Match = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      // fall through to plain filename
    }
  }
  const plainMatch = header.match(/filename="([^"]+)"/i);
  return plainMatch ? plainMatch[1] : fallback;
}

export default function DownloadButton({ video }: DownloadButtonProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = video.videoCandidates[selectedIndex] ?? video.videoCandidates[0];

  const downloadUrl = useMemo(
    () => buildDownloadUrl(selected.url, video.title),
    [selected.url, video.title]
  );

  const hasMultipleQualities = video.videoCandidates.length > 1;

  async function handleDownload() {
    setIsDownloading(true);
    setError(null);

    try {
      const res = await fetch(downloadUrl);

      if (!res.ok) {
        let message = "Không tải được video. Vui lòng thử lại.";
        try {
          const body = await res.json();
          if (typeof body?.error === "string") message = body.error;
        } catch {
          // response wasn't JSON - keep the generic message
        }
        setError(message);
        return;
      }

      const blob = await res.blob();
      const filename = filenameFromContentDisposition(
        res.headers.get("content-disposition"),
        "douyin-video.mp4"
      );

      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      setError("Không thể kết nối tới máy chủ. Vui lòng thử lại.");
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <div className="flex w-full flex-col gap-2">
      {hasMultipleQualities && (
        <select
          value={selectedIndex}
          onChange={(e) => {
            setSelectedIndex(Number(e.target.value));
            setError(null);
          }}
          className="w-full rounded-lg border border-black/10 bg-white/60 px-3 py-2 text-xs text-neutral-700 outline-none dark:border-white/15 dark:bg-white/5 dark:text-neutral-200"
        >
          {video.videoCandidates.map((candidate, index) => (
            <option key={candidate.url} value={index}>
              {candidate.qualityLabel}
            </option>
          ))}
        </select>
      )}

      <button
        type="button"
        onClick={handleDownload}
        disabled={isDownloading}
        className="flex w-full items-center justify-center rounded-xl bg-neutral-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
      >
        {isDownloading ? "Đang tải..." : "Download Video"}
      </button>

      {error && (
        <p className="text-center text-xs text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
