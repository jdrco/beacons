"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SlidersHorizontal, CircleCheck, Circle } from "lucide-react";

export type DisplaySettings = "all" | "available" | "limited" | "unavailable";

interface DisplaySettingsProps {
  onFilterChange: (filter: DisplaySettings) => void;
  currentFilter: DisplaySettings;
  currentDateTime: Date;
}

export default function DisplaySettingsDropdown({
  onFilterChange,
  currentFilter,
  currentDateTime,
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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={`flex items-center h-full border border-[#2b5f5a] rounded-xl md:rounded-2xl hover:bg-[#2a3137] focus:outline-none focus:ring-0 ${
            isFilterActive ? "bg-[#2a3137]" : ""
          }`}
        >
          <div className="relative">
            <SlidersHorizontal className="mx-2 p-1 md:p-0 md:mx-4 h-6 w-6" />
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
