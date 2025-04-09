"use client";

import { useRef, useCallback, useLayoutEffect } from "react";

/**
 * Hook to preserve scroll position when content changes
 * @param dependencies Array of dependencies that might cause scroll position changes
 * @returns Object containing scrollContainerRef
 */
export function useScrollPreservation(dependencies: any[] = []) {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const scrollPositionRef = useRef<number>(0);

  // Function to save current scroll position
  const saveScrollPosition = useCallback(() => {
    if (scrollContainerRef.current) {
      scrollPositionRef.current = scrollContainerRef.current.scrollTop;
    }
  }, []);

  // Function to restore saved scroll position
  const restoreScrollPosition = useCallback(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollPositionRef.current;
    }
  }, []);

  // Use layout effect to handle scroll position before/after render
  useLayoutEffect(() => {
    // Restore scroll position after render
    restoreScrollPosition();

    // Set up a small delay to ensure scroll position remains correct
    // after any animations complete
    const timeoutId = setTimeout(() => {
      restoreScrollPosition();
    }, 50); // Small delay to account for animations

    return () => clearTimeout(timeoutId);
  }, [...dependencies]);

  return {
    scrollContainerRef,
    saveScrollPosition,
    restoreScrollPosition,
  };
}
