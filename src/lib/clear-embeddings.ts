import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { db } from "../db";
import { sql } from "drizzle-orm";

async function main() {
  await db.execute(sql`UPDATE news_items SET embedding = NULL`);
  console.log("Cleared all embeddings");
  process.exit(0);
}

main().catch((error) => {
  console.error("Failed:", error);
  process.exit(1);
});
