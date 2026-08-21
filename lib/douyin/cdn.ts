/**
 * Hostnames Douyin actually serves video bytes from. The /api/download proxy
 * only forwards requests to these - otherwise it would be an open proxy.
 */
const ALLOWED_CDN_HOST_SUFFIXES = [
  "douyinvod.com",
  "douyincdn.com",
  "ibytedtos.com",
  "bytedtos.com",
  "snssdk.com",
  "zjcdn.com",
  "bytetos.com",
  "bytecdn.com",
  "pstatp.com",
  "douyinstatic.com",
];

export function isAllowedCdnUrl(input: string): boolean {
  try {
    const url = new URL(input);
    if (url.protocol !== "https:") return false;
    return ALLOWED_CDN_HOST_SUFFIXES.some(
      (suffix) => url.hostname === suffix || url.hostname.endsWith(`.${suffix}`)
    );
  } catch {
    return false;
  }
}
