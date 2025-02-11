"use client";
import { useState } from "react";
import { Filter, X } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SearchBar() {
  const [query, setQuery] = useState("");

  return (
    <div className="bg-[#1a1f23] flex">
      <div className="relative w-full group">
        <div className="relative flex items-center rounded-2xl border border-[#40474d] bg-[#1a1f23]/80 backdrop-blur-sm">
          <Filter className="absolute left-6 h-6 w-6 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter a building or classroom"
            className={cn(
              "h-12 md:h-16 w-full bg-transparent pl-16 pr-12 text-white placeholder:text-gray-500",
              "focus:outline-none focus:ring-0"
            )}
          />
          <button
            onClick={() => setQuery("")}
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
