import { DouyinParseErrorCode, DouyinVideo } from "@/lib/douyin/types";

export interface ParseSuccessResponse {
  success: true;
  data: DouyinVideo;
}

export interface ParseErrorResponse {
  success: false;
  error: {
    code: DouyinParseErrorCode;
    message: string;
  };
}

export type ParseResponse = ParseSuccessResponse | ParseErrorResponse;
