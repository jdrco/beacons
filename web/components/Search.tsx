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
    <div className="w-full h-full flex">
      <div className="relative w-full group">
        <div className="relative flex items-center rounded-xl md:rounded-2xl border border-[#2b5f5a]">
          <Search className="absolute left-3 md:left-6 h-6 w-6 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={handleQueryChange}
            placeholder="Search by building, room, or class"
            className={cn(
              "h-10 md:h-14 w-full bg-transparent px-16 text-white text-lg placeholder:text-gray-500",
              "focus:outline-none focus:ring-0"
            )}
          />
          <button
            onClick={handleClear}
            className={cn(
              "absolute right-3 md:right-6 rounded-full p-1 text-gray-400 transition-opacity",
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
