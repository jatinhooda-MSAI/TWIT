import { NewsSource, RawArticle } from "./types";

const NEWSAPI_BASE_URL = "https://newsapi.org/v2";

interface NewsAPIArticle {
  source?: { id?: string; name?: string };
  title?: string;
  description?: string;
  url?: string;
  urlToImage?: string;
  publishedAt?: string;
  content?: string;
}

interface NewsAPIResponse {
  status: string;
  totalResults: number;
  articles: NewsAPIArticle[];
}

// --- Security: injection & malicious content detection ---

const SUSPICIOUS_PATTERNS = [
  /<script[\s>]/i,
  /javascript:/i,
  /on\w+\s*=/i,
  /data:\s*text\/html/i,
  /SELECT\s+.+\s+FROM\s+/i,
  /INSERT\s+INTO\s+/i,
  /DROP\s+TABLE/i,
  /UNION\s+SELECT/i,
  /;\s*DROP\s/i,
  /\{\{.*\}\}/,
  /\$\{.*\}/,
];

function containsSuspiciousContent(text: string): boolean {
  return SUSPICIOUS_PATTERNS.some((pattern) => pattern.test(text));
}

function isValidHttpUrl(str: string): boolean {
  try {
    const parsed = new URL(str);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function stripHtmlTags(text: string): string {
  return text.replace(/<[^>]*>/g, "").trim();
}

function getOneWeekAgo(): string {
  const date = new Date();
  date.setDate(date.getDate() - 7);
  return date.toISOString().split("T")[0]; // YYYY-MM-DD
}

function normalizeArticle(raw: NewsAPIArticle): RawArticle | null {
  if (!raw.url || !raw.title) return null;
  // NewsAPI includes "[Removed]" placeholder articles
  if (raw.title === "[Removed]") return null;

  if (!isValidHttpUrl(raw.url)) return null;

  const title = stripHtmlTags(raw.title);
  if (title.length < 5 || title.length > 500) return null;
  if (containsSuspiciousContent(title)) return null;

  let summary: string | undefined;
  if (raw.description) {
    summary = stripHtmlTags(raw.description);
    if (containsSuspiciousContent(summary)) return null;
    if (summary.length > 2000) summary = summary.slice(0, 2000);
  }

  let imageUrl: string | undefined;
  if (raw.urlToImage && isValidHttpUrl(raw.urlToImage)) {
    imageUrl = raw.urlToImage;
  }

  let publishedAt = new Date();
  if (raw.publishedAt) {
    const parsed = new Date(raw.publishedAt);
    if (!isNaN(parsed.getTime())) publishedAt = parsed;
  }

  return {
    title,
    url: raw.url,
    publishedAt,
    summary,
    imageUrl,
    source: "newsapi",
  };
}

export const newsApiSource: NewsSource = {
  name: "newsapi",
  label: "NewsAPI",

  async fetchArticles(): Promise<RawArticle[]> {
    const apiKey = process.env.NEWSAPI_KEY;
    if (!apiKey) {
      throw new Error("NEWSAPI_KEY is not set");
    }

    const fromDate = getOneWeekAgo();
    const pageSize = parseInt(process.env.NEWSAPI_PAGE_SIZE || "50", 10);

    // Use /everything with tech-related query and date filter
    const params = new URLSearchParams({
      q: "technology OR tech OR AI OR software OR hardware",
      language: "en",
      sortBy: "publishedAt",
      from: fromDate,
      pageSize: String(Math.min(pageSize, 100)), // NewsAPI max is 100
      apiKey,
    });

    // Optionally restrict to specific domains
    const domains = process.env.NEWSAPI_DOMAINS;
    if (domains) {
      params.set("domains", domains);
    }

    console.log(`NewsAPI: fetching tech articles from ${fromDate}...`);

    const response = await fetch(`${NEWSAPI_BASE_URL}/everything?${params}`);

    if (!response.ok) {
      const body = await response.text();
      console.error(`NewsAPI returned ${response.status}: ${body.slice(0, 200)}`);
      return [];
    }

    const data: NewsAPIResponse = await response.json();

    if (data.status !== "ok") {
      console.error(`NewsAPI status: ${data.status}`);
      return [];
    }

    const articles: RawArticle[] = [];
    for (const item of data.articles) {
      const normalized = normalizeArticle(item);
      if (normalized) articles.push(normalized);
    }

    console.log(`NewsAPI: ${articles.length} articles (${data.totalResults} total available)`);
    return articles;
  },
};
