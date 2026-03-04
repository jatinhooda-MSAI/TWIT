import { NewsSource } from "./types";
import { hackerNewsSource } from "./hackernews";
import { newsApiSource } from "./newsapi";

export type { NewsSource, RawArticle } from "./types";

/**
 * Returns the list of enabled news sources based on the NEWS_SOURCES env var.
 *
 * NEWS_SOURCES is a comma-separated list of source IDs.
 * Valid IDs: hackernews, newsapi
 *
 * Default (if unset): hackernews only
 */
export function getEnabledSources(): NewsSource[] {
  const envSources = process.env.NEWS_SOURCES;

  const sourceIds = envSources
    ? envSources.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)
    : ["hackernews"];

  const sources: NewsSource[] = [];

  for (const id of sourceIds) {
    if (id === "hackernews") {
      sources.push(hackerNewsSource);
    } else if (id === "newsapi") {
      if (!process.env.NEWSAPI_KEY) {
        console.warn("NEWS_SOURCES includes newsapi but NEWSAPI_KEY is not set. Skipping.");
        continue;
      }
      sources.push(newsApiSource);
    }
  }

  if (sources.length === 0) {
    console.warn("No valid sources enabled. Falling back to Hacker News.");
    sources.push(hackerNewsSource);
  }

  return sources;
}
