import { useState, useRef, RefObject, MutableRefObject } from "react";

export interface BuildingSelectionProps {
  accordionContainerRef: RefObject<HTMLDivElement | null>;
  buildingItemRefs: MutableRefObject<{ [key: string]: HTMLElement | null }>;
}

export function useBuildingSelection({
  accordionContainerRef,
  buildingItemRefs,
}: BuildingSelectionProps) {
  const [selectedBuilding, setSelectedBuilding] = useState<string | null>(null);
  const [expandedAccordionItems, setExpandedAccordionItems] = useState<
    string[]
  >([]);
  const [showMapTooltip, setShowMapTooltip] = useState<boolean>(true);

  // Handle building selection from map or accordion
  const handleBuildingSelect = (buildingName: string) => {
    // Check if we're toggling the already selected building
    const isToggling =
      selectedBuilding === buildingName &&
      expandedAccordionItems.includes(buildingName);

    // Always update selected building first
    setSelectedBuilding(buildingName);

    if (isToggling) {
      // If we're collapsing, update the accordion state without scrolling
      setExpandedAccordionItems([]);
      // Also hide the tooltip when collapsing
      setShowMapTooltip(false);
    } else {
      // First collapse all
      setExpandedAccordionItems([]);

      // Show the tooltip
      setShowMapTooltip(true);

      // Then use a longer delay before expanding
      setTimeout(() => {
        // Expand the selected building
        setExpandedAccordionItems([buildingName]);

        // Add a much longer delay for scrolling on mobile
        const scrollDelay = window.innerWidth < 768 ? 500 : 300;

        setTimeout(() => {
          if (
            buildingItemRefs.current[buildingName] &&
            accordionContainerRef.current
          ) {
            const container = accordionContainerRef.current;
            const element = buildingItemRefs.current[buildingName];

            if (element && container) {
              // On mobile, use a simpler approach - just scroll the element into view
              if (window.innerWidth < 768) {
                element.scrollIntoView({ behavior: "smooth", block: "start" });
              } else {
                // On desktop, use the original approach with padding
                const scrollPosition = element.offsetTop - 130;
                container.scrollTo({
                  top: Math.max(0, scrollPosition),
                  behavior: "smooth",
                });
              }
            }
          }
        }, scrollDelay);
      }, 100); // Slightly longer initial delay
    }
  };

  return {
    selectedBuilding,
    expandedAccordionItems,
    showMapTooltip,
    setExpandedAccordionItems,
    handleBuildingSelect,
  };
}
