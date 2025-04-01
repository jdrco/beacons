"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DisplaySettings, DisplaySettingsProps } from "@/types";
import { SlidersHorizontal, CircleCheck, Circle } from "lucide-react";

export default function DisplaySettingsDropdown({
  onFilterChange,
  currentFilter,
}: DisplaySettingsProps) {
  // Determine if any filter is currently active (not "all")
  const isFilterActive = currentFilter !== "all";

  // Handle filter selection with toggle behavior
  const handleFilterChange = (value: string) => {
    // Type assertion to convert string to DisplaySettings
    const filterValue = value as DisplaySettings;
    // If the user selects the already active filter, toggle back to "all"
    if (filterValue === currentFilter) {
      onFilterChange("all");
    } else {
      onFilterChange(filterValue);
    }
  };

  // Get indicator color based on current filter
  const getIndicatorColor = () => {
    switch (currentFilter) {
      case "available":
        return "bg-[#4AA69D]";
      case "limited":
        return "bg-[#DDAA5E]";
      case "unavailable":
        return "bg-[#F66A6A]";
      default:
        return "bg-white";
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex h-full aspect-square rounded-full focus:outline-none focus:ring-0 relative bg-[#191f23] justify-center items-center">
          <div className="relative flex">
            <SlidersHorizontal className="h-4 w-4" />
            {/* Dot indicator - only shown when a filter is active */}
            {isFilterActive && (
              <div
                className={`absolute -top-3 -right-3 w-3 h-3 rounded-full ${getIndicatorColor()}`}
                aria-hidden="true"
              />
            )}
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-[#1e2329] border border-gray-700 text-white w-64">
        <div className="py-2 px-4">
          <h3 className="text-sm font-medium text-gray-300">
            Availability Filter
          </h3>
        </div>
        <DropdownMenuRadioGroup
          value={currentFilter}
          onValueChange={handleFilterChange}
        >
          <DropdownMenuRadioItem
            value="all"
            className="cursor-pointer hover:bg-[#2a3137] data-[state=checked]:bg-[#2a3137] focus:bg-[#2a3137] px-2 [&>span]:hidden"
          >
            <div className="flex items-center gap-2">
              {currentFilter === "all" ? (
                <CircleCheck className="w-4 h-4 text-white" strokeWidth={1.5} />
              ) : (
                <Circle className="w-4 h-4 text-white" strokeWidth={1.5} />
              )}
              <span>Show All Classrooms</span>
            </div>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem
            value="available"
            className="cursor-pointer hover:bg-[#2a3137] data-[state=checked]:bg-[#2a3137] focus:bg-[#2a3137] px-2 [&>span]:hidden"
          >
            <div className="flex items-center gap-2">
              {currentFilter === "available" ? (
                <CircleCheck
                  className="w-4 h-4 text-[#4AA69D]"
                  strokeWidth={1.5}
                />
              ) : (
                <Circle className="w-4 h-4 text-[#4AA69D]" strokeWidth={1.5} />
              )}
              <span>Mostly Available</span>
            </div>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem
            value="limited"
            className="cursor-pointer hover:bg-[#2a3137] data-[state=checked]:bg-[#2a3137] focus:bg-[#2a3137] px-2 [&>span]:hidden"
          >
            <div className="flex items-center gap-2">
              {currentFilter === "limited" ? (
                <CircleCheck
                  className="w-4 h-4 text-[#DDAA5E]"
                  strokeWidth={1.5}
                />
              ) : (
                <Circle className="w-4 h-4 text-[#DDAA5E]" strokeWidth={1.5} />
              )}
              <span>Limited Availability</span>
            </div>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem
            value="unavailable"
            className="cursor-pointer hover:bg-[#2a3137] data-[state=checked]:bg-[#2a3137] focus:bg-[#2a3137] px-2 [&>span]:hidden"
          >
            <div className="flex items-center gap-2">
              {currentFilter === "unavailable" ? (
                <CircleCheck
                  className="w-4 h-4 text-[#F66A6A]"
                  strokeWidth={1.5}
                />
              ) : (
                <Circle className="w-4 h-4 text-[#F66A6A]" strokeWidth={1.5} />
              )}
              <span>{"Mostly Unavailable"}</span>
            </div>
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
