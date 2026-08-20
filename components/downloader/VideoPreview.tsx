import Image from "next/image";
import { DouyinVideo } from "@/lib/douyin/types";
import DownloadButton from "@/components/downloader/DownloadButton";

interface VideoPreviewProps {
  video: DouyinVideo;
}

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function VideoPreview({ video }: VideoPreviewProps) {
  return (
    <div className="flex w-full flex-col gap-4 rounded-2xl border border-black/10 bg-white/60 p-4 shadow-sm dark:border-white/15 dark:bg-white/5">
      <div className="relative mx-auto aspect-[9/16] w-full max-w-[240px] overflow-hidden rounded-xl bg-neutral-200 dark:bg-neutral-800">
        <video
          src={video.videoUrl}
          poster={video.cover || undefined}
          controls
          playsInline
          className="h-full w-full object-cover"
        />
      </div>

      <div className="flex flex-col gap-1 text-center">
        <p className="line-clamp-2 text-sm font-medium text-neutral-900 dark:text-neutral-100">
          {video.title}
        </p>
        <div className="flex items-center justify-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
          {video.author.avatar && (
            <Image
              src={video.author.avatar}
              alt={video.author.name}
              width={16}
              height={16}
              unoptimized
              className="rounded-full"
            />
          )}
          <span>{video.author.name}</span>
          {video.duration > 0 && <span>· {formatDuration(video.duration)}</span>}
        </div>
      </div>

      <DownloadButton video={video} />
    </div>
  );
}
