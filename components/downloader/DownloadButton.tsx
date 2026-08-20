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

export default function DownloadButton({ video }: DownloadButtonProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selected = video.videoCandidates[selectedIndex] ?? video.videoCandidates[0];

  const downloadUrl = useMemo(
    () => buildDownloadUrl(selected.url, video.title),
    [selected.url, video.title]
  );

  const hasMultipleQualities = video.videoCandidates.length > 1;

  return (
    <div className="flex w-full flex-col gap-2">
      {hasMultipleQualities && (
        <select
          value={selectedIndex}
          onChange={(e) => setSelectedIndex(Number(e.target.value))}
          className="w-full rounded-lg border border-black/10 bg-white/60 px-3 py-2 text-xs text-neutral-700 outline-none dark:border-white/15 dark:bg-white/5 dark:text-neutral-200"
        >
          {video.videoCandidates.map((candidate, index) => (
            <option key={candidate.url} value={index}>
              {candidate.qualityLabel}
            </option>
          ))}
        </select>
      )}
      <a
        href={downloadUrl}
        download
        className="flex w-full items-center justify-center rounded-xl bg-neutral-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
      >
        Download Video
      </a>
    </div>
  );
}
