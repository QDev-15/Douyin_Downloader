import { douyinMobileHeaders, fetchWithTimeout } from "@/lib/http/client";
import { resolveAwemeId } from "@/lib/douyin/resolver";
import { DouyinParseError, DouyinParser, DouyinVideo, DouyinVideoCandidate } from "@/lib/douyin/types";

/**
 * Douyin's mobile "share" page (meant for in-app browsers / link previews)
 * server-renders the aweme JSON straight into the HTML as
 * `window._SSR_DATA` (older pages used `window._ROUTER_DATA`). It requires
 * no login, no cookies and no X-Bogus/A-Bogus signature - unlike the modern
 * `www.douyin.com/aweme/v1/web/aweme/detail` API, which 403s without one.
 */
const SHARE_PAGE_VARS = ["_SSR_DATA", "_ROUTER_DATA"];

const SPECIAL_CASE_MARKER = "special-case-wrap";

interface AwemeDetailLike {
  aweme_id?: string;
  desc?: string;
  video?: {
    play_addr?: { url_list?: string[] };
    download_addr?: { url_list?: string[] };
    bit_rate?: Array<{
      bit_rate?: number;
      gear_name?: string;
      play_addr?: { url_list?: string[] };
    }>;
    cover?: { url_list?: string[] };
    origin_cover?: { url_list?: string[] };
    dynamic_cover?: { url_list?: string[] };
    duration?: number;
    width?: number;
    height?: number;
  };
  author?: {
    nickname?: string;
    avatar_thumb?: { url_list?: string[] };
    avatar_medium?: { url_list?: string[] };
  };
}

function extractJsonAssignment(html: string, varName: string): unknown | null {
  const markerIndex = html.indexOf(`window.${varName}`);
  if (markerIndex === -1) return null;

  const eqIndex = html.indexOf("=", markerIndex);
  if (eqIndex === -1) return null;

  const braceStart = html.indexOf("{", eqIndex);
  if (braceStart === -1) return null;

  let depth = 0;
  let inString: false | string = false;
  let escaped = false;

  for (let i = braceStart; i < html.length; i++) {
    const ch = html[i];

    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === inString) inString = false;
      continue;
    }

    if (ch === '"' || ch === "'") {
      inString = ch;
      continue;
    }

    if (ch === "{") {
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0) {
        const jsonText = html.slice(braceStart, i + 1);
        try {
          return JSON.parse(jsonText);
        } catch {
          return null;
        }
      }
    }
  }

  return null;
}

function looksLikeAwemeDetail(node: unknown): node is AwemeDetailLike {
  if (!node || typeof node !== "object") return false;
  const obj = node as Record<string, unknown>;
  const video = obj.video as Record<string, unknown> | undefined;
  if (typeof obj.desc !== "string" || !video || typeof video !== "object") return false;
  return Boolean(video.play_addr || video.bit_rate || video.download_addr);
}

function findAwemeDetail(root: unknown): AwemeDetailLike | null {
  const queue: unknown[] = [root];
  let visited = 0;
  const MAX_VISITED = 8000;

  while (queue.length > 0 && visited < MAX_VISITED) {
    const node = queue.shift();
    visited++;

    if (looksLikeAwemeDetail(node)) return node;

    if (node && typeof node === "object") {
      for (const value of Object.values(node as Record<string, unknown>)) {
        if (value && typeof value === "object") queue.push(value);
      }
    }
  }

  return null;
}

function toNoWatermarkUrl(url: string): string {
  return url.replace(/playwm/g, "play");
}

function extractCandidates(detail: AwemeDetailLike): DouyinVideoCandidate[] {
  const candidates: DouyinVideoCandidate[] = [];
  const seen = new Set<string>();

  const push = (url: string | undefined, bitRate: number | undefined, label: string) => {
    if (!url) return;
    const clean = toNoWatermarkUrl(url);
    if (seen.has(clean)) return;
    seen.add(clean);
    candidates.push({ url: clean, bitRate, qualityLabel: label });
  };

  const sortedBitRates = [...(detail.video?.bit_rate ?? [])].sort(
    (a, b) => (b.bit_rate ?? 0) - (a.bit_rate ?? 0)
  );
  for (const entry of sortedBitRates) {
    push(
      entry.play_addr?.url_list?.[0],
      entry.bit_rate,
      entry.gear_name ?? (entry.bit_rate ? `${Math.round(entry.bit_rate / 1000)}kbps` : "default")
    );
  }

  push(detail.video?.play_addr?.url_list?.[0], undefined, "default");
  push(detail.video?.download_addr?.url_list?.[0], undefined, "download");

  return candidates;
}

function toDouyinVideo(detail: AwemeDetailLike, fallbackId: string): DouyinVideo {
  const videoCandidates = extractCandidates(detail);
  if (videoCandidates.length === 0) {
    throw new DouyinParseError("PARSE_FAILED", "Không tìm thấy đường dẫn video để tải.");
  }

  return {
    id: detail.aweme_id ?? fallbackId,
    title: detail.desc?.trim() || "Video Douyin",
    author: {
      name: detail.author?.nickname ?? "Không rõ",
      avatar:
        detail.author?.avatar_thumb?.url_list?.[0] ??
        detail.author?.avatar_medium?.url_list?.[0],
    },
    cover:
      detail.video?.cover?.url_list?.[0] ??
      detail.video?.origin_cover?.url_list?.[0] ??
      detail.video?.dynamic_cover?.url_list?.[0] ??
      "",
    duration: detail.video?.duration ? Math.round(detail.video.duration / 1000) : 0,
    videoUrl: videoCandidates[0].url,
    videoCandidates,
    width: detail.video?.width,
    height: detail.video?.height,
  };
}

async function fetchSharePageHtml(awemeId: string): Promise<string> {
  let res: Response;
  try {
    res = await fetchWithTimeout(`https://www.iesdouyin.com/share/video/${awemeId}/`, {
      headers: douyinMobileHeaders("https://www.iesdouyin.com/"),
      timeoutMs: 8000,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new DouyinParseError("TIMEOUT", "Kết nối tới Douyin quá lâu, vui lòng thử lại.");
    }
    throw new DouyinParseError("UPSTREAM_BLOCKED", "Không thể kết nối tới Douyin.");
  }

  if (res.status === 403 || res.status === 429) {
    throw new DouyinParseError(
      "UPSTREAM_BLOCKED",
      "Douyin đang chặn request. Vui lòng thử lại sau."
    );
  }
  if (!res.ok) {
    throw new DouyinParseError("NOT_FOUND", "Không tìm thấy video. Video có thể đã bị xóa.");
  }

  return res.text();
}

export async function parseDouyinUrl(rawUrl: string): Promise<DouyinVideo> {
  const awemeId = await resolveAwemeId(rawUrl);
  const html = await fetchSharePageHtml(awemeId);

  if (html.includes(SPECIAL_CASE_MARKER)) {
    throw new DouyinParseError(
      "NOT_FOUND",
      "Video không tồn tại, đã bị xóa, hoặc không công khai."
    );
  }

  let embedded: unknown = null;
  for (const varName of SHARE_PAGE_VARS) {
    embedded = extractJsonAssignment(html, varName);
    if (embedded) break;
  }

  if (!embedded) {
    throw new DouyinParseError(
      "PARSE_FAILED",
      "Không đọc được dữ liệu trang. Douyin có thể đã thay đổi cấu trúc."
    );
  }

  const detail = findAwemeDetail(embedded);
  if (!detail) {
    throw new DouyinParseError(
      "PARSE_FAILED",
      "Không lấy được thông tin video. Douyin có thể đã thay đổi cấu trúc dữ liệu."
    );
  }

  return toDouyinVideo(detail, awemeId);
}

export class DouyinShareParser implements DouyinParser {
  parse(url: string): Promise<DouyinVideo> {
    return parseDouyinUrl(url);
  }
}
