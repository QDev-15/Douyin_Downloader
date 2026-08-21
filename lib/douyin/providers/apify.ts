import { fetchWithTimeout } from "@/lib/http/client";
import { DouyinParseError, DouyinParser, DouyinVideo, DouyinVideoCandidate } from "@/lib/douyin/types";
import { extractFirstUrl, isLikelyDouyinUrl } from "@/lib/utils/url";

/**
 * Douyin only serves real video data to requests that look like they come
 * from mainland China - see lib/douyin/parser.ts for the (currently
 * unusable-on-Vercel) direct-HTTP approach and why it fails.
 *
 * Rather than operating our own mainland China proxy, we delegate to the
 * "easyapi/douyin-video-downloader" Apify actor, which already solves this
 * on its side. We just call its REST API.
 * https://apify.com/easyapi/douyin-video-downloader
 */
const ACTOR_ID = "easyapi~douyin-video-downloader";
const APIFY_TIMEOUT_MS = 45000;

interface ApifyMedia {
  url: string;
  quality?: string;
  extension?: string;
  type?: string;
  width?: number;
  height?: number;
}

interface ApifyDouyinResult {
  id?: string;
  author?: string;
  title?: string;
  thumbnail?: string;
  duration?: number;
  medias?: ApifyMedia[];
  error?: boolean;
}

interface ApifyDatasetItem {
  url: string;
  result?: ApifyDouyinResult;
  error?: string;
}

const QUALITY_LABELS: Record<string, string> = {
  hd_no_watermark: "HD (không watermark)",
  no_watermark: "Không watermark",
  watermark: "Có watermark",
};

const QUALITY_ORDER = ["hd_no_watermark", "no_watermark", "watermark"];

function qualityRank(quality: string | undefined): number {
  const index = QUALITY_ORDER.indexOf(quality ?? "");
  return index === -1 ? QUALITY_ORDER.length : index;
}

export class ApifyDouyinParser implements DouyinParser {
  async parse(rawUrl: string): Promise<DouyinVideo> {
    const url = extractFirstUrl(rawUrl.trim()) ?? rawUrl.trim();
    if (!isLikelyDouyinUrl(url)) {
      throw new DouyinParseError(
        "INVALID_URL",
        "Link không hợp lệ. Vui lòng dán link Douyin (v.douyin.com hoặc douyin.com)."
      );
    }

    const token = process.env.APIFY_API_TOKEN;
    if (!token) {
      throw new DouyinParseError("UNKNOWN", "Server chưa cấu hình APIFY_API_TOKEN.");
    }

    let res: Response;
    try {
      res = await fetchWithTimeout(
        `https://api.apify.com/v2/acts/${ACTOR_ID}/run-sync-get-dataset-items?token=${token}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ links: [url] }),
          timeoutMs: APIFY_TIMEOUT_MS,
        }
      );
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new DouyinParseError(
          "TIMEOUT",
          "Kết nối tới dịch vụ phân tích quá lâu, vui lòng thử lại."
        );
      }
      throw new DouyinParseError("UPSTREAM_BLOCKED", "Không thể kết nối tới dịch vụ phân tích video.");
    }

    if (!res.ok) {
      throw new DouyinParseError("UPSTREAM_BLOCKED", "Dịch vụ phân tích video đang gặp sự cố.");
    }

    let items: ApifyDatasetItem[];
    try {
      items = (await res.json()) as ApifyDatasetItem[];
    } catch {
      throw new DouyinParseError("PARSE_FAILED", "Không đọc được phản hồi từ dịch vụ phân tích video.");
    }

    const result = items[0]?.result;
    if (!result || result.error) {
      throw new DouyinParseError(
        "NOT_FOUND",
        "Video không tồn tại, đã bị xóa, hoặc không công khai."
      );
    }

    const videoMedias = (result.medias ?? []).filter((m) => m.type === "video" && m.url);
    if (videoMedias.length === 0) {
      throw new DouyinParseError("PARSE_FAILED", "Không tìm thấy đường dẫn video để tải.");
    }

    const sorted = [...videoMedias].sort((a, b) => qualityRank(a.quality) - qualityRank(b.quality));
    const videoCandidates: DouyinVideoCandidate[] = sorted.map((m) => ({
      url: m.url,
      qualityLabel: (m.quality && QUALITY_LABELS[m.quality]) || m.quality || "default",
    }));
    const best = sorted[0];

    return {
      id: result.id ?? "",
      title: result.title?.trim() || "Video Douyin",
      author: { name: result.author?.trim() || "Không rõ" },
      cover: result.thumbnail || "",
      duration: result.duration ? Math.round(result.duration / 1000) : 0,
      videoUrl: videoCandidates[0].url,
      videoCandidates,
      width: best.width,
      height: best.height,
    };
  }
}
