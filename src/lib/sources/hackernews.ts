import { NewsSource, RawArticle } from "./types";

const HN_TOP_STORIES_URL = "https://hacker-news.firebaseio.com/v0/topstories.json";
const HN_ITEM_URL = "https://hacker-news.firebaseio.com/v0/item";

interface HNStory {
  id: number;
  title: string;
  url?: string;
  by: string;
  score: number;
  time: number;
}

async function fetchTopStoryIds(limit: number = 20): Promise<number[]> {
  const response = await fetch(HN_TOP_STORIES_URL);
  const ids: number[] = await response.json();
  return ids.slice(0, limit);
}

async function fetchStory(id: number): Promise<HNStory | null> {
  const response = await fetch(`${HN_ITEM_URL}/${id}.json`);
  const story = await response.json();
  return story;
}

function isValidHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export const hackerNewsSource: NewsSource = {
  name: "hackernews",
  label: "Hacker News",

  async fetchArticles(): Promise<RawArticle[]> {
    console.log("Fetching top stories from Hacker News...");
    const storyIds = await fetchTopStoryIds(20);
    const articles: RawArticle[] = [];

    for (const id of storyIds) {
      const story = await fetchStory(id);
      if (!story || !story.url || !isValidHttpUrl(story.url)) continue;

      articles.push({
        title: story.title,
        url: story.url,
        publishedAt: new Date(story.time * 1000),
        source: "hackernews",
      });
    }

    console.log(`Hacker News: fetched ${articles.length} articles`);
    return articles;
  },
};
