import { db } from "@/db";
import { newsItems } from "@/db/schema";
import { desc, eq, gte, lte, and, SQL, sql } from "drizzle-orm";
import { Header } from "@/components/Header";
import { NewsCard } from "@/components/NewsCard";
import { Filters } from "@/components/Filters";
import { SourceTabs } from "@/components/SourceTabs";
import { Suspense } from "react";
import { SubscribeForm } from "@/components/SubscribeForm";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ category?: string; sentiment?: string; page?: string; source?: string }>;
}

const ITEMS_PER_PAGE = 10;

function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "...", total];
  if (current >= total - 3) return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "...", current - 1, current, current + 1, "...", total];
}

export default async function Home({ searchParams }: PageProps) {
  const params = await searchParams;
  const { category, sentiment, page, source } = params;
  const parsed = parseInt(page || "1", 10);
  const currentPage = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;

  // Get distinct sources from DB
  const sourceRows = await db
    .selectDistinct({ source: newsItems.source })
    .from(newsItems)
    .orderBy(newsItems.source);
  const availableSources = sourceRows.map((r) => r.source);

  // Default to first available source (hackernews sorts first alphabetically)
  const activeSource = source && availableSources.includes(source)
    ? source
    : availableSources[0] || "hackernews";

  // Build filter conditions
  const conditions: SQL[] = [eq(newsItems.source, activeSource)];

  if (category && category !== "All") {
    conditions.push(eq(newsItems.category, category));
  }

  if (sentiment === "positive") {
    conditions.push(gte(newsItems.sentimentScore, 7));
  } else if (sentiment === "neutral") {
    conditions.push(gte(newsItems.sentimentScore, 4));
    conditions.push(lte(newsItems.sentimentScore, 6));
  } else if (sentiment === "negative") {
    conditions.push(lte(newsItems.sentimentScore, 3));
  }

  // Get total count for pagination
  const countResult = await db
    .select({ total: sql<number>`count(*)` })
    .from(newsItems)
    .where(and(...conditions));
  const totalItems = Number(countResult[0]?.total ?? 0);
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  // Fetch only the current page
  const news = await db
    .select()
    .from(newsItems)
    .where(and(...conditions))
    .orderBy(desc(newsItems.createdAt))
    .limit(ITEMS_PER_PAGE)
    .offset(offset);

  return (
    <div className="min-h-screen bg-zinc-950">
      <Header />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Source Tabs */}
        <Suspense fallback={null}>
          <SourceTabs sources={availableSources} />
        </Suspense>

        {/* Stats Bar */}
        <div className="flex items-center gap-6 mb-6 text-sm font-mono-display text-zinc-500">
          <span>
            <span className="text-green-500">{totalItems}</span> stories
            {(category || sentiment) && " (filtered)"}
          </span>
          <span>
            Page {currentPage} of {totalPages}
          </span>
        </div>

        {/* Filters */}
        <Suspense fallback={null}>
          <Filters />
        </Suspense>

        {/* News Grid */}
        {news.length === 0 ? (
          <div className="text-center py-20 text-zinc-500">
            <p>No stories match your filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {news.map((item) => (
              <NewsCard key={item.id} item={item} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <a
              href={`?${new URLSearchParams({
                source: activeSource,
                ...(category && { category }),
                ...(sentiment && { sentiment }),
                page: String(Math.max(1, currentPage - 1)),
              }).toString()}`}
              className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
                currentPage === 1
                  ? "border-zinc-800 text-zinc-600 pointer-events-none"
                  : "border-zinc-700 text-zinc-300 hover:border-green-500/50 hover:bg-green-500/10"
              }`}
            >
              Previous
            </a>

            <div className="flex items-center gap-1">
              {getPageNumbers(currentPage, totalPages).map((pageNum, idx) =>
                pageNum === "..." ? (
                  <span key={`ellipsis-${idx}`} className="w-10 h-10 flex items-center justify-center text-sm text-zinc-500">
                    ...
                  </span>
                ) : (
                  <a
                    key={pageNum}
                    href={`?${new URLSearchParams({
                      source: activeSource,
                      ...(category && { category }),
                      ...(sentiment && { sentiment }),
                      page: String(pageNum),
                    }).toString()}`}
                    className={`w-10 h-10 flex items-center justify-center text-sm rounded-lg border transition-colors ${
                      pageNum === currentPage
                        ? "border-green-500 bg-green-500/20 text-green-500"
                        : "border-zinc-700 text-zinc-400 hover:border-green-500/50 hover:bg-green-500/10"
                    }`}
                  >
                    {pageNum}
                  </a>
                )
              )}
            </div>

            <a
              href={`?${new URLSearchParams({
                source: activeSource,
                ...(category && { category }),
                ...(sentiment && { sentiment }),
                page: String(Math.min(totalPages, currentPage + 1)),
              }).toString()}`}
              className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
                currentPage === totalPages
                  ? "border-zinc-800 text-zinc-600 pointer-events-none"
                  : "border-zinc-700 text-zinc-300 hover:border-green-500/50 hover:bg-green-500/10"
              }`}
            >
              Next
            </a>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-8 mt-12">
        <div className="max-w-6xl mx-auto px-4 flex flex-col items-center gap-4">
          <p className="text-sm text-zinc-400">Get the top tech news delivered daily</p>
          <SubscribeForm />
          <p className="text-xs text-zinc-600 font-mono-display mt-2">
            TWIT — AI-powered tech news aggregator
          </p>
        </div>
      </footer>
    </div>
  );
}
