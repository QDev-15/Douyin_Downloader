export interface DouyinVideoCandidate {
  url: string;
  bitRate?: number;
  qualityLabel: string;
}

export interface DouyinVideo {
  id: string;
  title: string;
  author: {
    name: string;
    avatar?: string;
  };
  cover: string;
  duration: number;
  videoUrl: string;
  videoCandidates: DouyinVideoCandidate[];
  width?: number;
  height?: number;
}

export type DouyinParseErrorCode =
  | "INVALID_URL"
  | "RESOLVE_FAILED"
  | "NOT_FOUND"
  | "PARSE_FAILED"
  | "UPSTREAM_BLOCKED"
  | "TIMEOUT"
  | "UNKNOWN";

export class DouyinParseError extends Error {
  code: DouyinParseErrorCode;

  constructor(code: DouyinParseErrorCode, message: string) {
    super(message);
    this.name = "DouyinParseError";
    this.code = code;
  }
}

export interface DouyinParser {
  parse(url: string): Promise<DouyinVideo>;
}
