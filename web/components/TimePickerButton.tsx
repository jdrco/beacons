"use client";

import React, { useState, useEffect } from "react";
import { Clock, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { DateTimePicker } from "./DateTimePicker";
import { useTime } from "@/contexts/TimeContext";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface TimePickerButtonProps {
  className?: string;
}

export function TimePickerButton({ className }: TimePickerButtonProps) {
  const { currentTime, isCustomTime, setCustomTime, resetToRealTime } =
    useTime();
  const [time, setTime] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  // Update displayed time
  useEffect(() => {
    const hours = currentTime.getHours().toString().padStart(2, "0");
    const minutes = currentTime.getMinutes().toString().padStart(2, "0");
    const seconds = currentTime.getSeconds().toString().padStart(2, "0");
    setTime(`${hours}:${minutes}:${seconds}`);
  }, [currentTime]);

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      setCustomTime(date);
    }
    setIsOpen(false);
  };

  const handleReset = () => {
    resetToRealTime();
    setIsOpen(false);
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex items-center whitespace-nowrap font-mono text-sm">
        <span className={cn(isCustomTime ? "text-[#4AA69D]" : "")}>{time}</span>
        <span className="ml-3 font-bold">Edmonton</span>
      </div>

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              "rounded-full h-8 w-8 flex justify-center items-center",
              isCustomTime
                ? "bg-[#4AA69D] text-white"
                : "bg-[#2b5f5a48] text-white hover:bg-[#2b5f5a80]"
            )}
            type="button"
            aria-label="Select time"
          >
            <Clock className="h-4 w-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-4">
          <div className="flex flex-col gap-4">
            <div className="font-medium text-center">Select custom time</div>
            <DateTimePicker selected={currentTime} onSelect={handleSelect} />
            {isCustomTime && (
              <button
                onClick={handleReset}
                className="flex items-center justify-center gap-2 p-2 rounded-md bg-gray-200 dark:bg-gray-800 text-sm"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Reset to current time</span>
              </button>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
