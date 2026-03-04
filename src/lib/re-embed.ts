import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import postgres from "postgres";
import { embed } from "ai";
import { createAzure } from "@ai-sdk/azure";
import { createOpenAI } from "@ai-sdk/openai";

const pgClient = postgres(process.env.DATABASE_URL!, { prepare: false });

const embeddingDimensions = parseInt(process.env.AI_EMBEDDING_DIMENSIONS || "1536", 10);

function buildEmbeddingModel() {
  const provider = process.env.AI_EMBEDDING_PROVIDER || "openai";
  const model = process.env.AI_EMBEDDING_MODEL || "text-embedding-3-small";
  const apiKey = process.env.AI_EMBEDDING_API_KEY || process.env.AI_API_KEY || process.env.OPENAI_API_KEY;

  if (provider === "azure") {
    const resourceName = process.env.AZURE_RESOURCE_NAME;
    if (!resourceName) throw new Error("AZURE_RESOURCE_NAME is required");
    return createAzure({ apiKey: apiKey!, resourceName }).embedding(model);
  }
  return createOpenAI({ apiKey: apiKey! }).embedding(model);
}

const embeddingModel = buildEmbeddingModel();

const AI_RPM = parseInt(process.env.AI_RPM || "15", 10);
const AI_RPD = parseInt(process.env.AI_RPD || "1500", 10);
const AI_DELAY_MS = Math.ceil(60_000 / AI_RPM);

let requestCount = 0;
let lastRequestTime = 0;

async function throttle() {
  if (requestCount >= AI_RPD) {
    throw new Error(`Daily limit reached (${requestCount}/${AI_RPD}). Re-run to continue.`);
  }
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (lastRequestTime > 0 && elapsed < AI_DELAY_MS) {
    await new Promise((resolve) => setTimeout(resolve, AI_DELAY_MS - elapsed));
  }
  lastRequestTime = Date.now();
  requestCount++;
}

async function main() {
  console.log(`\nRe-embedding all articles`);
  console.log(`Model: ${process.env.AI_EMBEDDING_MODEL || "text-embedding-3-small"}`);
  console.log(`Dimensions: ${embeddingDimensions}`);
  console.log(`Rate limits: ${AI_RPM} RPM, ${AI_RPD} RPD\n`);

  const allItems = await pgClient`SELECT id, title, summary FROM news_items`;

  console.log(`Found ${allItems.length} articles to re-embed\n`);

  let success = 0;
  let failed = 0;

  for (const item of allItems) {
    const text = `${item.title} ${item.summary || ""}`.trim();
    try {
      await throttle();
      const { embedding: newEmbedding } = await embed({
        model: embeddingModel,
        value: text,
      });

      const truncated = newEmbedding.slice(0, embeddingDimensions);
      const vectorStr = `[${truncated.join(",")}]`;
      await pgClient.unsafe(
        `UPDATE news_items SET embedding = $1::vector(${embeddingDimensions}) WHERE id = $2`,
        [vectorStr, item.id]
      );

      success++;
      console.log(`[${success + failed}/${allItems.length}] OK: ${item.title.slice(0, 60)}...`);
    } catch (error) {
      failed++;
      const msg = error instanceof Error ? error.message : String(error);
      // Print a short error line, then stop on first failure so the user can diagnose
      console.error(`\nFAILED on article #${success + failed}: "${item.title.slice(0, 60)}..."`);
      console.error(`Error: ${msg.slice(0, 300)}`);
      console.log(`\nFix the issue above and re-run. ${success} articles were updated before this failure.`);
      break;
    }
  }

  console.log(`\nDone! ${success} updated, ${failed} failed out of ${allItems.length} total.`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error("Re-embed script failed:", error);
  process.exit(1);
});
