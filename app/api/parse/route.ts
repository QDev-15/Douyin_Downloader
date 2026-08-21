import { NextRequest, NextResponse } from "next/server";
import { ApifyDouyinParser } from "@/lib/douyin/providers/apify";
import { DouyinParseError, DouyinParseErrorCode } from "@/lib/douyin/types";
import { ParseResponse } from "@/types/video";

export const runtime = "nodejs";

const parser = new ApifyDouyinParser();

const STATUS_BY_CODE: Record<DouyinParseErrorCode, number> = {
  INVALID_URL: 400,
  RESOLVE_FAILED: 422,
  NOT_FOUND: 404,
  PARSE_FAILED: 502,
  UPSTREAM_BLOCKED: 502,
  TIMEOUT: 504,
  UNKNOWN: 500,
};

export async function POST(request: NextRequest): Promise<NextResponse<ParseResponse>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_URL", message: "Request không hợp lệ." } },
      { status: 400 }
    );
  }

  const url = (body as { url?: unknown })?.url;
  if (typeof url !== "string" || url.trim().length === 0) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_URL", message: "Vui lòng nhập link Douyin." } },
      { status: 400 }
    );
  }

  try {
    const video = await parser.parse(url);
    return NextResponse.json({ success: true, data: video });
  } catch (err) {
    if (err instanceof DouyinParseError) {
      return NextResponse.json(
        { success: false, error: { code: err.code, message: err.message } },
        { status: STATUS_BY_CODE[err.code] }
      );
    }

    console.error("Unexpected /api/parse error:", err);
    return NextResponse.json(
      {
        success: false,
        error: { code: "UNKNOWN", message: "Đã có lỗi không xác định xảy ra." },
      },
      { status: 500 }
    );
  }
}
