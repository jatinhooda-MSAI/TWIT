"use client";

import { useState } from "react";
import { Search, Loader2, X, ExternalLink } from "lucide-react";
import { semanticSearch } from "@/app/actions";

interface SearchResult {
  id: number;
  title: string;
  url: string;
  summary: string;
  sentimentScore: number;
  category: string;
  similarity: number;
}

export function SearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    setShowResults(true);

    const searchResults = await semanticSearch(query);
    setResults(searchResults as unknown as SearchResult[]);
    setIsSearching(false);
  };

  const clearSearch = () => {
    setQuery("");
    setResults([]);
    setShowResults(false);
  };

  return (
    <div className="relative w-full max-w-md">
      <form onSubmit={handleSearch}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Semantic search... (e.g. 'AI safety concerns')"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-10 pr-10 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-green-500"
          />
          {query && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="w-4 h-4 text-zinc-500 hover:text-zinc-300" />
            </button>
          )}
        </div>
      </form>

      {/* Results Dropdown */}
      {showResults && (
        <div className="absolute top-full mt-2 w-full bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
          {isSearching ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-green-500" />
              <span className="ml-2 text-sm text-zinc-400">Searching...</span>
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-zinc-500 text-sm">No results found</p>
              <p className="text-zinc-600 text-xs mt-1">Try a different search term</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {results.map((item) => (
                <a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 p-4 hover:bg-zinc-800 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-zinc-100 mb-1 line-clamp-2">
                      {item.title}
                    </h4>
                    <p className="text-xs text-zinc-500 line-clamp-2">{item.summary}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
                        {item.category}
                      </span>
                      <span className="text-xs text-green-500">
                        {Math.round(item.similarity * 100)}% match
                      </span>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-zinc-600 flex-shrink-0" />
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Click outside to close */}
      {showResults && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowResults(false)}
        />
      )}
    </div>
  );
}
