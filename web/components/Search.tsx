"use client";
import { useState, useRef, useEffect } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  onSearch: (query: string) => void;
  filterType?: "limited" | "full";
  onExpandChange?: (isExpanded: boolean) => void;
}

export default function SearchBar({
  onSearch,
  filterType = "limited",
  onExpandChange,
}: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Check if we're in mobile view
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint is 768px
    };

    // Initial check
    checkScreenSize();

    // Add event listener for resize
    window.addEventListener("resize", checkScreenSize);

    // Clean up
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  // Handle outside clicks to collapse search on mobile
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        isMobile &&
        isExpanded &&
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setIsExpanded(false);
        // Notify parent component about collapsed state
        onExpandChange?.(false);
      }
    };

    if (isMobile && isExpanded) {
      document.addEventListener("click", handleOutsideClick);
    }

    return () => {
      document.removeEventListener("click", handleOutsideClick);
    };
  }, [isMobile, isExpanded]);

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
  const handleClear = (event?: React.MouseEvent) => {
    // Stop event propagation to prevent immediate re-expansion
    // when clicking the X button (which is inside the search container)
    event?.stopPropagation();

    setQuery("");

    // Clear any pending debounce timers
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Directly call onSearch with empty string
    onSearch("");

    // Reset focus state for both mobile and desktop
    setIsFocused(false);

    // For mobile, collapse the search bar too
    if (isMobile) {
      // Blur the input element to remove focus
      if (inputRef.current) {
        inputRef.current.blur();
      }

      // Collapse the search bar
      setIsExpanded(false);
      // Notify parent component about collapsed state
      onExpandChange?.(false);
    } else {
      // On desktop, just blur the input
      if (inputRef.current) {
        inputRef.current.blur();
      }
    }
  };

  // Handle click on the search icon in mobile view
  const handleSearchIconClick = () => {
    if (isMobile && !isExpanded) {
      setIsExpanded(true);
      // Notify parent component about expanded state
      onExpandChange?.(true);
      // Focus the input after expanding
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 10);
    }
  };

  // Handle focus event
  const handleFocus = () => {
    setIsFocused(true);
  };

  // Handle blur event on mobile
  const handleBlur = () => {
    setIsFocused(false);

    // Only collapse if there's no query
    if (isMobile && query === "") {
      setIsExpanded(false);
      // Notify parent component about collapsed state
      onExpandChange?.(false);
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

  // Determine if we should show the expanded search or the circular icon
  const showExpandedSearch = !isMobile || isExpanded;

  return (
    <div className="w-full h-full flex" ref={searchContainerRef}>
      <div
        className={cn(
          "relative w-full group",
          isMobile && !isExpanded && "w-10 h-10 aspect-square"
        )}
      >
        <div
          className={cn(
            "relative flex items-center rounded-full bg-[#191f23]",
            isMobile && !isExpanded
              ? "w-10 h-10 aspect-square justify-center cursor-pointer transition-all duration-300"
              : "w-full transition-all duration-300"
          )}
          onClick={handleSearchIconClick}
        >
          <Search
            className={cn(
              isMobile && !isExpanded
                ? "w-4 h-4 relative"
                : "absolute left-3 md:left-3 w-4 h-4 md:h-4 md:w-6"
            )}
          />

          {/* Active search indicator dot */}
          {isMobile && !isExpanded && query && (
            <div
              className="absolute -top-0 -right-0 w-3 h-3 rounded-full bg-white"
              aria-hidden="true"
            />
          )}

          {showExpandedSearch && (
            <>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={handleQueryChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                placeholder={
                  filterType === "limited"
                    ? "Search for a building or room"
                    : "Search building, room, or class"
                }
                className={cn(
                  "h-10 md:h-10 w-full bg-transparent px-10 md:px-10 text-white text-sm md:text-base placeholder:text-gray-500",
                  "focus:outline-none focus:ring-0"
                )}
              />
              <button
                onClick={handleClear}
                className={cn(
                  "absolute right-3 md:right-6 rounded-full p-1 text-gray-400 transition-opacity",
                  "hover:text-gray-300",
                  !query && !isFocused && "opacity-0" // Show X button when focused
                )}
                type="button"
                aria-label="Clear search"
              >
                <X className="h-5 w-5" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
