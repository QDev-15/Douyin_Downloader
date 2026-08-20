import { douyinMobileHeaders, fetchWithTimeout } from "@/lib/http/client";
import { extractAwemeId, extractFirstUrl, isLikelyDouyinUrl } from "@/lib/utils/url";
import { DouyinParseError } from "@/lib/douyin/types";

/**
 * Turns whatever the user pasted (a bare URL, or a full Douyin share text
 * blob containing a URL) into a numeric aweme (video) ID.
 *
 * Short links (v.douyin.com/xxxx) carry no ID themselves - we must follow
 * the HTTP redirect Douyin issues and read the ID off the resolved URL.
 */
export async function resolveAwemeId(rawInput: string): Promise<string> {
  const url = extractFirstUrl(rawInput.trim()) ?? rawInput.trim();

  if (!isLikelyDouyinUrl(url)) {
    throw new DouyinParseError(
      "INVALID_URL",
      "Link không hợp lệ. Vui lòng dán link Douyin (v.douyin.com hoặc douyin.com)."
    );
  }

  const directId = extractAwemeId(url);
  if (directId) return directId;

  let resolvedUrl: string;
  try {
    const res = await fetchWithTimeout(url, {
      method: "GET",
      redirect: "follow",
      headers: douyinMobileHeaders("https://www.douyin.com/"),
      timeoutMs: 8000,
    });
    resolvedUrl = res.url || url;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new DouyinParseError("TIMEOUT", "Kết nối tới Douyin quá lâu, vui lòng thử lại.");
    }
    throw new DouyinParseError(
      "RESOLVE_FAILED",
      "Không thể phân giải link Douyin. Link có thể đã sai hoặc bị xóa."
    );
  }

  const resolvedId = extractAwemeId(resolvedUrl);
  if (!resolvedId) {
    throw new DouyinParseError(
      "RESOLVE_FAILED",
      "Không tìm thấy video ID sau khi phân giải link. Link có thể không hợp lệ."
    );
  }

  return resolvedId;
}
