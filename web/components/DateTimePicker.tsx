"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DateTimePickerProps {
  selected?: Date;
  onSelect?: (date: Date | undefined) => void;
  className?: string;
}

export function DateTimePicker({
  selected,
  onSelect,
  className,
}: DateTimePickerProps) {
  const [date, setDate] = React.useState<Date | undefined>(selected);
  const [isMobile, setIsMobile] = React.useState(false);

  // Check if device is mobile
  React.useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint is 768px
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  React.useEffect(() => {
    setDate(selected);
  }, [selected]);

  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5);

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      // Preserve time from current selection
      if (date) {
        selectedDate.setHours(date.getHours(), date.getMinutes(), 0);
      }
      setDate(selectedDate);
      if (onSelect) onSelect(selectedDate);
    }
  };

  const handleTimeChange = (
    type: "hour" | "minute" | "ampm",
    value: string
  ) => {
    if (date) {
      const newDate = new Date(date);
      if (type === "hour") {
        newDate.setHours(
          (parseInt(value) % 12) + (newDate.getHours() >= 12 ? 12 : 0)
        );
      } else if (type === "minute") {
        newDate.setMinutes(parseInt(value));
      } else if (type === "ampm") {
        const currentHours = newDate.getHours();
        const isPM = currentHours >= 12;

        if (value === "PM" && !isPM) {
          newDate.setHours(currentHours + 12);
        } else if (value === "AM" && isPM) {
          newDate.setHours(currentHours - 12);
        }
      }
      setDate(newDate);
      if (onSelect) onSelect(newDate);
    }
  };

  // Format minutes to always show two digits (e.g., "05" instead of "5")
  const formatMinute = (minute: number) => {
    return minute < 10 ? `0${minute}` : `${minute}`;
  };

  return (
    <div className={className}>
      <div className="flex flex-col gap-6">
        {/* Calendar */}
        <div className="mx-auto">
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleDateSelect}
            initialFocus
            className="border rounded-md"
          />
        </div>

        {/* Time selector with labels */}
        <div className="flex flex-col gap-4">
          <h3 className="text-sm font-medium text-center text-gray-700">
            Time Selection
          </h3>

          <div
            className={`grid ${isMobile ? "grid-cols-3" : "grid-cols-3"} gap-2`}
          >
            {/* Hour column */}
            <div className="flex flex-col">
              <p className="text-xs font-medium text-center mb-2 text-gray-500">
                Hour
              </p>
              <ScrollArea className="h-40 border rounded-md">
                <div className="flex flex-col p-2">
                  {hours.map((hour) => (
                    <Button
                      key={hour}
                      variant={
                        date && date.getHours() % 12 === hour % 12
                          ? "default"
                          : "ghost"
                      }
                      className="w-full justify-center py-2 px-0"
                      onClick={() => handleTimeChange("hour", hour.toString())}
                    >
                      {hour}
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Minute column */}
            <div className="flex flex-col">
              <p className="text-xs font-medium text-center mb-2 text-gray-500">
                Minute
              </p>
              <ScrollArea className="h-40 border rounded-md">
                <div className="flex flex-col p-2">
                  {minutes.map((minute) => (
                    <Button
                      key={minute}
                      variant={
                        date && date.getMinutes() === minute
                          ? "default"
                          : "ghost"
                      }
                      className="w-full justify-center py-2 px-0"
                      onClick={() =>
                        handleTimeChange("minute", minute.toString())
                      }
                    >
                      {formatMinute(minute)}
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* AM/PM column */}
            <div className="flex flex-col">
              <p className="text-xs font-medium text-center mb-2 text-gray-500">
                AM/PM
              </p>
              <div className="flex flex-col gap-2 h-40 border rounded-md p-2 justify-start">
                {["AM", "PM"].map((ampm) => (
                  <Button
                    key={ampm}
                    variant={
                      date &&
                      ((ampm === "AM" && date.getHours() < 12) ||
                        (ampm === "PM" && date.getHours() >= 12))
                        ? "default"
                        : "ghost"
                    }
                    className="w-full py-2"
                    onClick={() => handleTimeChange("ampm", ampm)}
                  >
                    {ampm}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Current selection display */}
        {date && (
          <div className="text-center text-sm">
            <p className="font-medium">Selected:</p>
            <p className="text-gray-700">
              {date.toLocaleDateString()}{" "}
              {date.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
