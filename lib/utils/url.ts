const DOUYIN_HOST_SUFFIXES = [
  "douyin.com",
  "iesdouyin.com",
];

export function isLikelyDouyinUrl(input: string): boolean {
  const url = tryParseUrl(input);
  if (!url) return false;
  return DOUYIN_HOST_SUFFIXES.some(
    (suffix) => url.hostname === suffix || url.hostname.endsWith(`.${suffix}`)
  );
}

export function tryParseUrl(input: string): URL | null {
  try {
    return new URL(input);
  } catch {
    return null;
  }
}

/**
 * Douyin share text often looks like:
 * "3.14 复制打开抖音，看看【xxx】 https://v.douyin.com/xxxxx/ 生活很有趣"
 * Extract the first http(s) URL from arbitrary pasted text.
 */
export function extractFirstUrl(input: string): string | null {
  const match = input.match(/https?:\/\/[^\s，,。]+/);
  return match ? match[0] : null;
}

const AWEME_ID_PATTERNS = [
  /\/video\/(\d+)/,
  /\/note\/(\d+)/,
  /\/share\/video\/(\d+)/,
  /[?&]item_ids=(\d+)/,
  /[?&]aweme_id=(\d+)/,
  /[?&]modal_id=(\d+)/,
];

export function extractAwemeId(url: string): string | null {
  for (const pattern of AWEME_ID_PATTERNS) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}
