import { NextRequest, NextResponse } from "next/server";
import { douyinMobileHeaders, fetchWithTimeout } from "@/lib/http/client";
import { isAllowedCdnUrl } from "@/lib/douyin/cdn";

export const runtime = "nodejs";

function sanitizeForFilename(input: string): string {
  return input
    .replace(/[\r\n"]/g, "")
    .replace(/[/\\?%*:|<>]/g, "_")
    .trim()
    .slice(0, 80);
}

/**
 * Content-Disposition's plain `filename=` parameter must be ASCII (it's an
 * HTTP header value) - Node throws if we try to set a header with raw
 * Chinese/emoji characters in it. The real title goes in `filename*=UTF-8''`
 * instead, which every modern browser prefers and which is always
 * percent-encoded (so always ASCII-safe as a header value).
 */
function toAsciiFilenameFallback(input: string): string {
  const asciiOnly = input.replace(/[^\x20-\x7E]/g, "").replace(/\s+/g, " ").trim();
  return asciiOnly.length > 0 ? asciiOnly : "douyin-video";
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const videoUrl = searchParams.get("url");
    const title = searchParams.get("title") ?? "douyin-video";

    if (!videoUrl) {
      return NextResponse.json({ error: "Thiếu tham số url." }, { status: 400 });
    }

    if (!isAllowedCdnUrl(videoUrl)) {
      return NextResponse.json({ error: "URL video không hợp lệ." }, { status: 400 });
    }

    let upstream: Response;
    try {
      upstream = await fetchWithTimeout(videoUrl, {
        headers: douyinMobileHeaders("https://www.douyin.com/"),
        timeoutMs: 20000,
      });
    } catch {
      return NextResponse.json({ error: "Không thể tải video từ Douyin." }, { status: 502 });
    }

    if (!upstream.ok || !upstream.body) {
      return NextResponse.json({ error: "Douyin từ chối yêu cầu tải video." }, { status: 502 });
    }

    const cleanTitle = sanitizeForFilename(title) || "douyin-video";
    const asciiFilename = `${toAsciiFilenameFallback(cleanTitle)}.mp4`;
    const utf8Filename = `${cleanTitle}.mp4`;

    const headers = new Headers();
    headers.set("Content-Type", upstream.headers.get("content-type") ?? "video/mp4");
    const contentLength = upstream.headers.get("content-length");
    if (contentLength) headers.set("Content-Length", contentLength);
    headers.set(
      "Content-Disposition",
      `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodeURIComponent(utf8Filename)}`
    );
    headers.set("Cache-Control", "no-store");

    return new NextResponse(upstream.body, { status: 200, headers });
  } catch (err) {
    console.error("Unexpected /api/download error:", err);
    return NextResponse.json({ error: "Đã có lỗi không xác định xảy ra." }, { status: 500 });
  }
}
