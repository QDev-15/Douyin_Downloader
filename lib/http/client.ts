import { fetch as undiciFetch, ProxyAgent } from "undici";

export const MOBILE_USER_AGENT =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1";

const DEFAULT_TIMEOUT_MS = 8000;

export interface FetchWithTimeoutOptions extends RequestInit {
  timeoutMs?: number;
}

/**
 * Douyin only serves real video data to requests that look like they
 * originate from mainland China - everything else (including Vercel's
 * edge/datacenter IPs) gets a generic empty "open the app" fallback page.
 * Set DOUYIN_PROXY_URL (e.g. http://user:pass@host:port) to route all
 * outbound Douyin requests through a mainland China proxy.
 */
let cachedProxyAgent: ProxyAgent | null | undefined;

function getProxyAgent(): ProxyAgent | undefined {
  if (cachedProxyAgent !== undefined) return cachedProxyAgent ?? undefined;

  const proxyUrl = process.env.DOUYIN_PROXY_URL;
  cachedProxyAgent = proxyUrl ? new ProxyAgent(proxyUrl) : null;
  return cachedProxyAgent ?? undefined;
}

export async function fetchWithTimeout(
  url: string,
  options: FetchWithTimeoutOptions = {}
): Promise<Response> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...init } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const dispatcher = getProxyAgent();

  try {
    if (dispatcher) {
      const res = await undiciFetch(url, {
        ...(init as Record<string, unknown>),
        signal: controller.signal,
        dispatcher,
      });
      return res as unknown as Response;
    }

    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export function douyinMobileHeaders(referer = "https://www.iesdouyin.com/"): HeadersInit {
  return {
    "User-Agent": MOBILE_USER_AGENT,
    Referer: referer,
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  };
}

export function hasDouyinProxy(): boolean {
  return Boolean(process.env.DOUYIN_PROXY_URL);
}
