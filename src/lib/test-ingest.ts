import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { ingestLatestNews } from "./ingest";

async function main() {
  await ingestLatestNews();
  process.exit(0);
}

main().catch(console.error);
