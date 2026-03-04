"use client";

import { useRouter, useSearchParams } from "next/navigation";

const CATEGORIES = ["All", "AI", "Web", "Mobile", "Security", "Hardware", "Business", "Programming", "Other"];

const SENTIMENTS = [
  { label: "All", value: "all" },
  { label: "🚀 Positive (7+)", value: "positive" },
  { label: "😐 Neutral (4-6)", value: "neutral" },
  { label: "⚠️ Negative (1-3)", value: "negative" },
];

export function Filters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentCategory = searchParams.get("category") || "All";
  const currentSentiment = searchParams.get("sentiment") || "all";

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "All" || value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`/?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap gap-4 mb-6">
      {/* Category Filter */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-zinc-500 font-mono-display">Category:</span>
        <select
          value={currentCategory}
          onChange={(e) => updateFilter("category", e.target.value)}
          className="bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-zinc-100 focus:outline-none focus:border-green-500 cursor-pointer"
        >
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Sentiment Filter */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-zinc-500 font-mono-display">Sentiment:</span>
        <select
          value={currentSentiment}
          onChange={(e) => updateFilter("sentiment", e.target.value)}
          className="bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-zinc-100 focus:outline-none focus:border-green-500 cursor-pointer"
        >
          {SENTIMENTS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {/* Clear Filters */}
      {(currentCategory !== "All" || currentSentiment !== "all") && (
        <button
          onClick={() => router.push("/")}
          className="text-xs text-zinc-500 hover:text-green-500 transition-colors"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
