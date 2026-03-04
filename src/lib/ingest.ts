import { generateObject, embed } from "ai";
import { chatModel, embeddingModel, embeddingDimensions } from "@/lib/ai-config";
import { z } from "zod";
import { db } from "@/db";
import { newsItems } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getEnabledSources, type RawArticle } from "@/lib/sources";
import { extractOgImage, extractArticleText } from "@/lib/og-image";

// ─── AI rate limiting (configurable via env) ─────────────────────
const AI_RPM = parseInt(process.env.AI_RPM || "15", 10);
const AI_RPD = parseInt(process.env.AI_RPD || "1500", 10);
const AI_DELAY_MS = Math.ceil(60_000 / AI_RPM);

let aiRequestCount = 0;
let aiLastRequestTime = 0;

async function aiThrottle(): Promise<void> {
  if (aiRequestCount >= AI_RPD) {
    throw new Error(`AI daily limit reached (${aiRequestCount}/${AI_RPD}). Stopping ingest.`);
  }
  const now = Date.now();
  const elapsed = now - aiLastRequestTime;
  if (aiLastRequestTime > 0 && elapsed < AI_DELAY_MS) {
    const waitMs = AI_DELAY_MS - elapsed;
    console.log(`AI: throttling ${waitMs}ms (${AI_RPM} RPM limit)`);
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
  aiLastRequestTime = Date.now();
  aiRequestCount++;
}

const fullAnalysisSchema = z.object({
  summary: z.string().describe("A 2-sentence summary of the tech news for a busy CTO"),
  sentimentScore: z.number().min(1).max(10).describe("Sentiment: 1=very negative, 5=neutral, 10=very positive"),
  category: z.enum(["AI", "Web", "Mobile", "Security", "Hardware", "Business", "Programming", "Other"]),
});

const partialAnalysisSchema = z.object({
  sentimentScore: z.number().min(1).max(10).describe("Sentiment: 1=very negative, 5=neutral, 10=very positive"),
  category: z.enum(["AI", "Web", "Mobile", "Security", "Hardware", "Business", "Programming", "Other"]),
});

async function analyzeArticle(article: RawArticle) {
  await aiThrottle();

  if (article.summary) {
    // Source already provided a summary — only need sentiment + category
    const { object } = await generateObject({
      model: chatModel,
      schema: partialAnalysisSchema,
      prompt: `Analyze this tech news article:\nTitle: ${article.title}\nSummary: ${article.summary}\n\nProvide a sentiment score (1-10) and categorize it.`,
    });
    return {
      summary: article.summary,
      sentimentScore: object.sentimentScore,
      category: object.category,
      aiGenerated: false,
    };
  }

  // No summary — fetch article content and do full AI analysis
  console.log(`Fetching article text: ${article.url}`);
  const content = await extractArticleText(article.url);
  const aiGenerated = !content;

  const prompt = content
    ? `Analyze this tech news article:\nTitle: ${article.title}\nContent: ${content}\n\nProvide a concise 2-sentence summary, a sentiment score (1-10), and categorize it.`
    : `Analyze this tech news article based ONLY on its title. Do not mention that you lack the full article.\nTitle: ${article.title}\n\nProvide a concise 2-sentence summary, a sentiment score (1-10), and categorize it.`;

  const { object } = await generateObject({
    model: chatModel,
    schema: fullAnalysisSchema,
    prompt,
  });
  return { ...object, aiGenerated };
}

async function generateEmbedding(text: string): Promise<number[]> {
  await aiThrottle();

  const { embedding } = await embed({
    model: embeddingModel,
    value: text,
  });
  return embedding.slice(0, embeddingDimensions);
}

let _ingestLock = false;

async function _runIngest() {
  aiRequestCount = 0;
  aiLastRequestTime = 0;

  const sources = getEnabledSources();
  console.log(`\nIngesting from ${sources.length} source(s): ${sources.map((s) => s.name).join(", ")}`);

  let totalNew = 0;
  let totalSkipped = 0;

  for (const source of sources) {
    console.log(`\n--- ${source.label} (${source.name}) ---`);

    let articles: RawArticle[];
    try {
      articles = await source.fetchArticles();
    } catch (error) {
      console.error(`Failed to fetch from ${source.name}:`, error);
      continue;
    }

    let sourceNew = 0;
    let sourceSkipped = 0;

    for (const article of articles) {
      const existing = await db.query.newsItems.findFirst({
        where: eq(newsItems.url, article.url),
      });

      if (existing) {
        sourceSkipped++;
        continue;
      }

      try {
        console.log(`Analyzing: ${article.title.slice(0, 60)}...`);
        const analysis = await analyzeArticle(article);

        console.log(`Generating embedding...`);
        const embeddingText = `${article.title} ${analysis.summary}`;
        const embedding = await generateEmbedding(embeddingText);

        // Extract og:image if the source didn't provide an image
        let imageUrl = article.imageUrl ?? null;
        if (!imageUrl) {
          console.log(`Extracting og:image...`);
          imageUrl = await extractOgImage(article.url);
        }

        await db.insert(newsItems).values({
          title: article.title,
          url: article.url,
          summary: analysis.summary,
          sentimentScore: analysis.sentimentScore,
          category: analysis.category,
          source: article.source,
          imageUrl,
          aiGenerated: analysis.aiGenerated,
          publishedAt: article.publishedAt,
          embedding,
        });

        console.log(`Added: ${article.title.slice(0, 60)}...`);
        sourceNew++;
      } catch (error) {
        console.error(`Failed to process: ${article.title}`, error);
      }
    }

    console.log(`${source.label}: +${sourceNew} new, ${sourceSkipped} skipped`);
    totalNew += sourceNew;
    totalSkipped += sourceSkipped;
  }

  console.log(`\nDone! Added ${totalNew} new items total, skipped ${totalSkipped}`);
  return { newCount: totalNew, skippedCount: totalSkipped };
}

export async function ingestLatestNews() {
  if (_ingestLock) throw new Error("Ingest already in progress");
  _ingestLock = true;
  try {
    return await _runIngest();
  } finally {
    _ingestLock = false;
  }
}
