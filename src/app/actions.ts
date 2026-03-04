"use server";

import { ingestLatestNews } from "@/lib/ingest";
import { db } from "@/db";
import { subscribers } from "@/db/schema";
import { embed } from "ai";
import { embeddingModel } from "@/lib/ai-config";
import { sql } from "drizzle-orm";

export async function refreshNews() {
  const result = await ingestLatestNews();
  return result;
}

export async function subscribeEmail(email: string) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    return { success: false, error: "Invalid email" };
  }

  try {
    await db.insert(subscribers).values({ email }).onConflictDoNothing();
    return { success: true };
  } catch (error) {
    console.error("Subscribe error:", error);
    return { success: false, error: "Failed to subscribe" };
  }
}

export async function semanticSearch(query: string) {
  if (!query.trim()) return [];

  try {
    // Generate embedding for the search query
    const { embedding } = await embed({
      model: embeddingModel,
      value: query,
    });

    // Search using cosine similarity
    const results = await db.execute(sql`
      SELECT
        id,
        title,
        url,
        summary,
        sentiment_score as "sentimentScore",
        category,
        source,
        image_url as "imageUrl",
        published_at as "publishedAt",
        created_at as "createdAt",
        1 - (embedding <=> ${JSON.stringify(embedding)}::vector) as similarity
      FROM news_items
      WHERE embedding IS NOT NULL
      ORDER BY embedding <=> ${JSON.stringify(embedding)}::vector
      LIMIT 5
    `);

    return results as unknown as Record<string, unknown>[];
  } catch (error) {
    console.error("Semantic search error:", error);
    return [];
  }
}
