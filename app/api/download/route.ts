import { NextRequest, NextResponse } from "next/server";
import { douyinMobileHeaders, fetchWithTimeout } from "@/lib/http/client";
import { isAllowedCdnUrl } from "@/lib/douyin/cdn";

export const runtime = "nodejs";

function sanitizeFilename(input: string): string {
  const stripped = input.replace(/[\r\n"]/g, "").replace(/[/\\?%*:|<>]/g, "_").trim();
  const truncated = stripped.slice(0, 80);
  return truncated.length > 0 ? truncated : "douyin-video";
}

export async function GET(request: NextRequest) {
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
    return NextResponse.json(
      { error: "Douyin từ chối yêu cầu tải video." },
      { status: 502 }
    );
  }

  const filename = `${sanitizeFilename(title)}.mp4`;
  const headers = new Headers();
  headers.set("Content-Type", upstream.headers.get("content-type") ?? "video/mp4");
  const contentLength = upstream.headers.get("content-length");
  if (contentLength) headers.set("Content-Length", contentLength);
  headers.set(
    "Content-Disposition",
    `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`
  );
  headers.set("Cache-Control", "no-store");

  return new NextResponse(upstream.body, { status: 200, headers });
}
