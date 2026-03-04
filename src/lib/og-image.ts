/**
 * Blocks requests to private/reserved IP ranges to prevent SSRF attacks.
 */
function isPrivateHost(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname === "::1" ||
      hostname.endsWith(".local") ||
      hostname.endsWith(".internal") ||
      hostname === "169.254.169.254" ||
      /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|0\.)/.test(hostname) ||
      hostname.startsWith("fd") ||
      hostname.startsWith("fe80")
    ) {
      return true;
    }
    return false;
  } catch {
    return true;
  }
}

/**
 * Fetches a webpage and extracts readable text content for AI summarization.
 * Strips HTML tags, scripts, styles, and returns plain text (truncated to maxChars).
 */
export async function extractArticleText(url: string, maxChars = 15000, timeoutMs = 8000): Promise<string | null> {
  if (isPrivateHost(url)) return null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; TwitBot/1.0)",
        Accept: "text/html",
      },
      redirect: "follow",
    });

    clearTimeout(timer);

    if (!response.ok) return null;

    const reader = response.body?.getReader();
    if (!reader) return null;

    let html = "";
    const decoder = new TextDecoder();
    const maxBytes = 500_000;

    while (html.length < maxBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      html += decoder.decode(value, { stream: true });
    }

    reader.cancel();

    // Remove non-content blocks, then strip all HTML tags
    let text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
      .replace(/<header[\s\S]*?<\/header>/gi, " ")
      .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&[a-z]+;/gi, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (text.length < 50) return null;

    return text.slice(0, maxChars);
  } catch {
    return null;
  }
}

/**
 * Extracts the og:image URL from a webpage's Open Graph meta tags.
 * Used as a fallback for sources (like Hacker News) that don't provide article images.
 */
export async function extractOgImage(url: string, timeoutMs = 5000): Promise<string | null> {
  if (isPrivateHost(url)) return null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; TwitBot/1.0)",
        Accept: "text/html",
      },
      redirect: "follow",
    });

    clearTimeout(timer);

    if (!response.ok) return null;

    // Read only the first ~50KB to find meta tags (they're in <head>)
    const reader = response.body?.getReader();
    if (!reader) return null;

    let html = "";
    const decoder = new TextDecoder();
    const maxBytes = 50_000;

    while (html.length < maxBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      html += decoder.decode(value, { stream: true });

      // Stop early if we've passed </head>
      if (html.includes("</head>")) break;
    }

    reader.cancel();

    // Match og:image meta tag (handles both property and name attributes, single and double quotes)
    const ogMatch = html.match(
      /<meta[^>]+(?:property|name)=["']og:image["'][^>]+content=["']([^"']+)["']/i
    ) ?? html.match(
      /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']og:image["']/i
    );

    if (ogMatch?.[1]) {
      const imageUrl = ogMatch[1];
      // Basic validation: must look like a URL
      if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
        return imageUrl;
      }
    }

    return null;
  } catch {
    // Timeout, network error, or parse failure — not critical
    return null;
  }
}
