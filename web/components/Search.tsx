"use client";

import { useState } from "react";
import { Search, Filter, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  onSearch: (query: string) => void;
}

export default function SearchBar({ onSearch }: SearchBarProps) {
  const [query, setQuery] = useState("");

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    onSearch(newQuery);
  };

  const handleClear = () => {
    setQuery("");
    onSearch("");
  };

  return (
    <div className="bg-[#1a1f23] flex">
      <div className="relative w-full group">
        <div className="relative flex items-center rounded-2xl border border-[#40474d] bg-[#1a1f23]/80 backdrop-blur-sm">
          <Search className="absolute left-6 h-6 w-6 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={handleQueryChange}
            placeholder="Filter by building or classroom"
            className={cn(
              "h-10 md:h-14 w-full bg-transparent pl-16 pr-12 text-white text-lg placeholder:text-gray-500",
              "focus:outline-none focus:ring-0"
            )}
          />
          <button
            onClick={handleClear}
            className={cn(
              "absolute right-6 rounded-full p-1 text-gray-400 transition-opacity",
              "hover:text-gray-300",
              !query && "opacity-0"
            )}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
