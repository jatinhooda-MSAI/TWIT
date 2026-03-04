import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { db } from "../db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Dropping old vector column (3072)...");
  await db.execute(sql`ALTER TABLE news_items DROP COLUMN IF EXISTS embedding`);

  console.log("Adding new vector column (1536)...");
  await db.execute(sql`ALTER TABLE news_items ADD COLUMN embedding vector(1536)`);

  console.log("Done! Vector column is now 1536 dimensions.");
  process.exit(0);
}

main().catch((error) => {
  console.error("Failed:", error);
  process.exit(1);
});
