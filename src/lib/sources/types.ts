export interface RawArticle {
  title: string;
  url: string;
  publishedAt: Date;
  /** Pre-existing summary from the source, if available */
  summary?: string;
  /** Image URL from the source, if available */
  imageUrl?: string;
  /** Source identifier (e.g., "hackernews", "techcrunch") */
  source: string;
}

export interface NewsSource {
  /** Unique identifier for this source */
  name: string;
  /** Human-readable label */
  label: string;
  /** Fetch articles from this source */
  fetchArticles(): Promise<RawArticle[]>;
}
