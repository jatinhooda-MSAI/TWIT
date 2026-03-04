import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { db } from "./index";
import { newsItems } from "./schema";

async function seed() {
  console.log("🌱 Seeding database...");

  const dummyNews = [
    {
      title: "OpenAI Announces GPT-5 with Reasoning Capabilities",
      url: "https://example.com/gpt5-announcement",
      summary: "OpenAI reveals GPT-5, featuring advanced reasoning and reduced hallucinations. The model shows significant improvements in complex problem-solving.",
      sentimentScore: 9,
      category: "AI",
      source: "hackernews",
      publishedAt: new Date("2025-01-10"),
    },
    {
      title: "Apple Vision Pro 2 Leaks Suggest 50% Weight Reduction",
      url: "https://example.com/vision-pro-2-leaks",
      summary: "Leaked schematics reveal Apple's next VR headset will be significantly lighter. Industry analysts predict a Q4 2025 release.",
      sentimentScore: 7,
      category: "Hardware",
      source: "hackernews",
      publishedAt: new Date("2025-01-09"),
    },
  ];

  for (const item of dummyNews) {
    await db.insert(newsItems).values(item).onConflictDoNothing();
  }

  console.log("✅ Seeding complete! Inserted 2 dummy news items.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
