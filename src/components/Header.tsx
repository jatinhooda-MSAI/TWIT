"use client";

import { useState } from "react";
import { RefreshCw, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { refreshNews } from "@/app/actions";
import { SearchBar } from "./SearchBar";

export function Header() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ newCount: number; skippedCount: number } | null>(null);

  const handleRefresh = async () => {
    setIsLoading(true);
    setResult(null);
    try {
      const res = await refreshNews();
      setResult(res);
    } catch (error) {
      console.error("Failed to refresh:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur sticky top-0 z-50">
      <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Zap className="w-6 h-6 text-green-500" />
          <h1 className="text-xl font-bold tracking-tight">
            TW<span className="text-green-500">IT</span>
          </h1>
        </div>

        {/* Search */}
        <SearchBar />

        {/* Refresh Button */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {result && (
            <span className="text-xs text-zinc-500 font-mono-display">
              +{result.newCount} new
            </span>
          )}
          <Button
            onClick={handleRefresh}
            disabled={isLoading}
            variant="outline"
            size="sm"
            className="border-zinc-700 hover:border-green-500/50 hover:bg-green-500/10"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            {isLoading ? "..." : "Refresh"}
          </Button>
        </div>
      </div>
    </header>
  );
}
