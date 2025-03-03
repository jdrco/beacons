"use client";

import { useState } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

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
    <div className="w-full relative">
      {/* Simplified container structure */}
      <Search className="absolute left-3 md:left-6 top-1/2 -translate-y-1/2 h-6 w-6 text-black z-10" />

      <Input
        type="text"
        value={query}
        onChange={handleQueryChange}
        placeholder="Filter by building or classroom"
        className="w-full pl-12 md:pl-16 pr-10 py-6 rounded-md"
      />

      {query && (
        <button
          onClick={handleClear}
          className="absolute right-3 md:right-6 top-1/2 -translate-y-1/2 h-6 w-6 text-black z-10"
        >
          <X />
        </button>
      )}
    </div>
  );
}
