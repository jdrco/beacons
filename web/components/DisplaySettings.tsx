"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { SlidersHorizontal, CircleCheck, Circle } from "lucide-react";

export type DisplaySettings = "all" | "available" | "limited" | "unavailable";

interface DisplaySettingsProps {
  onFilterChange: (filter: DisplaySettings) => void;
  currentFilter: DisplaySettings;
  onTimeChange: (date: Date) => void;
  currentDateTime: Date;
}

export default function DisplaySettingsDropdown({
  onFilterChange,
  currentFilter,
  onTimeChange,
  currentDateTime,
}: DisplaySettingsProps) {
  // Determine if any filter is currently active (not "all")
  const isFilterActive = currentFilter !== "all";

  // More precise check to determine if a custom time is being used
  const now = new Date();
  const isCustomTime =
    currentDateTime.getDate() !== now.getDate() ||
    currentDateTime.getMonth() !== now.getMonth() ||
    currentDateTime.getFullYear() !== now.getFullYear() ||
    currentDateTime.getHours() !== now.getHours() ||
    currentDateTime.getMinutes() !== now.getMinutes();

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

  // Days of the week for selection
  const daysOfWeek = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  // Time slots for selection (hourly increments)
  const timeSlots = Array.from({ length: 24 }, (_, i) => {
    const hour = i;
    const ampm = hour < 12 ? "AM" : "PM";
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return {
      label: `${displayHour}:00 ${ampm}`,
      value: hour,
    };
  });

  // Handle day selection
  const handleDaySelect = (dayIndex: number) => {
    const now = new Date();
    const currentDay = now.getDay();
    const diff = dayIndex - currentDay;

    const newDate = new Date(now);
    newDate.setDate(now.getDate() + diff);
    // Keep the current custom time if it exists
    if (isCustomTime) {
      newDate.setHours(
        currentDateTime.getHours(),
        currentDateTime.getMinutes()
      );
    }
    onTimeChange(newDate);
  };

  // Handle time selection
  const handleTimeSelect = (hour: number) => {
    const newDate = new Date(currentDateTime);
    newDate.setHours(hour, 0, 0, 0);
    onTimeChange(newDate);
  };

  // Reset to current time
  const handleResetTime = () => {
    onTimeChange(new Date());
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={`flex items-center h-full border border-[#2b5f5a] rounded-xl md:rounded-2xl hover:bg-[#2a3137] focus:outline-none focus:ring-0 ${
            isFilterActive || isCustomTime ? "bg-[#2a3137]" : ""
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

        <DropdownMenuSeparator className="bg-gray-700" />

        <div className="py-2 px-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium text-gray-300">Custom Time</h3>
            {isCustomTime && (
              <button
                className="text-xs text-[#4AA69D] hover:text-[#3a817a]"
                onClick={handleResetTime}
              >
                Reset to current time
              </button>
            )}
          </div>
          <div className="mt-1 text-xs text-gray-400">
            Current: {daysOfWeek[currentDateTime.getDay()]},{" "}
            {currentDateTime.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>

        <div className="px-3 py-2">
          <h4 className="text-xs font-medium text-gray-400 mb-1">Day</h4>
          <div className="grid grid-cols-4 gap-1">
            {daysOfWeek.map((day, index) => (
              <button
                key={day}
                className={`text-xs py-1 px-2 rounded ${
                  currentDateTime.getDay() === index
                    ? "bg-[#2b5f5a] text-white"
                    : "bg-[#2a3137] text-gray-300 hover:bg-[#323c44]"
                }`}
                onClick={() => handleDaySelect(index)}
              >
                {day.substring(0, 3)}
              </button>
            ))}
          </div>
        </div>

        <div className="px-3 py-2">
          <h4 className="text-xs font-medium text-gray-400 mb-1">Time</h4>
          <div className="grid grid-cols-4 gap-1 max-h-40 overflow-y-auto">
            {timeSlots.map((slot) => (
              <button
                key={slot.value}
                className={`text-xs py-1 px-1 rounded ${
                  currentDateTime.getHours() === slot.value
                    ? "bg-[#2b5f5a] text-white"
                    : "bg-[#2a3137] text-gray-300 hover:bg-[#323c44]"
                }`}
                onClick={() => handleTimeSelect(slot.value)}
              >
                {slot.label}
              </button>
            ))}
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
