"use client";
import { useState, useRef, useEffect } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  onSearch: (query: string) => void;
  filterType?: "limited" | "full";
}

export default function SearchBar({
  onSearch,
  filterType = "limited",
}: SearchBarProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Handle input changes with debounce
  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);

    // Clear any existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set a new timer to delay the search
    debounceTimerRef.current = setTimeout(() => {
      onSearch(newQuery);
    }, 250); // 250ms debounce
  };

  // Separate handler for clearing to ensure we don't trigger time filter issues
  const handleClear = () => {
    setQuery("");

    // Clear any pending debounce timers
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Directly call onSearch with empty string
    onSearch("");

    // Focus the input after clearing
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Clean up the debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="w-full h-full flex">
      <div className="relative w-full group">
        <div className="relative flex items-center rounded-xl md:rounded-2xl border border-[#2b5f5a]">
          <Search className="absolute left-3 md:left-6 w-4 h-4 md:h-6 md:w-6" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleQueryChange}
            placeholder={
              filterType === "limited"
                ? "Search building or room"
                : "Search building, room, or class"
            }
            className={cn(
              "h-10 md:h-14 w-full bg-transparent px-10 md:px-16 text-white text-sm md:text-lg placeholder:text-gray-500",
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
            type="button"
            aria-label="Clear search"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
