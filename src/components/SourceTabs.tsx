"use client";

import { useRouter, useSearchParams } from "next/navigation";

const SOURCE_LABELS: Record<string, string> = {
  hackernews: "Hacker News",
  newsapi: "NewsAPI",
};

interface SourceTabsProps {
  sources: string[];
}

export function SourceTabs({ sources }: SourceTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentSource = searchParams.get("source") || sources[0] || "hackernews";

  const handleSourceChange = (source: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("source", source);
    params.delete("page");
    router.push(`/?${params.toString()}`);
  };

  return (
    <div className="flex gap-2 mb-6">
      {sources.map((source) => (
        <button
          key={source}
          onClick={() => handleSourceChange(source)}
          className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
            currentSource === source
              ? "border-green-500 bg-green-500/20 text-green-400"
              : "border-zinc-700 text-zinc-400 hover:border-green-500/50 hover:bg-green-500/10"
          }`}
        >
          {SOURCE_LABELS[source] || source}
        </button>
      ))}
    </div>
  );
}
