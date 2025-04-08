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
  const [isOpen, setIsOpen] = React.useState(false);

  React.useEffect(() => {
    setDate(selected);
  }, [selected]);

  const hours = Array.from({ length: 24 }, (_, i) => i); // 24-hour format
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5); // 5-minute intervals

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      // Keep the time from our current selection
      if (date) {
        selectedDate.setHours(date.getHours(), date.getMinutes());
      }
      setDate(selectedDate);
      if (onSelect) onSelect(selectedDate);
    }
  };

  const handleTimeChange = (type: "hour" | "minute", value: number) => {
    if (date) {
      const newDate = new Date(date);
      if (type === "hour") {
        newDate.setHours(value, newDate.getMinutes());
      } else if (type === "minute") {
        newDate.setMinutes(value);
      }
      setDate(newDate);
      if (onSelect) onSelect(newDate);
    }
  };

  const confirmSelection = () => {
    if (onSelect && date) {
      onSelect(date);
    }
    setIsOpen(false);
  };

  return (
    <div className={className}>
      <div className="flex flex-col gap-4">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleDateSelect}
          initialFocus
          className="border rounded-md"
        />
        <div className="flex space-x-2">
          <div className="flex-1 border rounded-md overflow-hidden">
            <ScrollArea className="h-60">
              <div className="p-2 grid grid-cols-2 gap-1">
                {hours.map((hour) => (
                  <Button
                    key={hour}
                    variant={
                      date && date.getHours() === hour ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() => handleTimeChange("hour", hour)}
                    className="justify-start"
                  >
                    {hour.toString().padStart(2, "0")}:00
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>
          <div className="flex-1 border rounded-md overflow-hidden">
            <ScrollArea className="h-60">
              <div className="p-2 grid grid-cols-2 gap-1">
                {minutes.map((minute) => (
                  <Button
                    key={minute}
                    variant={
                      date && date.getMinutes() === minute
                        ? "default"
                        : "outline"
                    }
                    size="sm"
                    onClick={() => handleTimeChange("minute", minute)}
                    className="justify-start"
                  >
                    :{minute.toString().padStart(2, "0")}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
        <Button onClick={confirmSelection} className="w-full">
          Confirm Time
        </Button>
      </div>
    </div>
  );
}
