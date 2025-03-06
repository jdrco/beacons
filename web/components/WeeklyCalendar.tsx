"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";

interface Schedule {
  dates: string;
  time: string;
  location: string;
  capacity: number;
  course: string;
}

interface CalendarEvent {
  dayIndex: number;
  startTime: number;
  endTime: number;
  course: string;
  location: string;
  capacity: number;
  dates: string;
}

interface WeeklyCalendarProps {
  schedules?: Schedule[];
  currentDateTime?: Date; // Add prop for the selected date/time
}

export function WeeklyCalendar({
  schedules = [],
  currentDateTime = new Date(), // Default to current time if not provided
}: WeeklyCalendarProps) {
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null
  );
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [currentTimePosition, setCurrentTimePosition] = useState<number | null>(
    null
  );
  const timeGridRef = useRef<HTMLDivElement>(null);

  // Day labels (starting with Monday)
  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // Time slots (from 8 AM to 8 PM)
  const timeSlots = [
    "8am",
    "9am",
    "10am",
    "11am",
    "12pm",
    "1pm",
    "2pm",
    "3pm",
    "4pm",
    "5pm",
    "6pm",
    "7pm",
    "8pm",
  ];

  // Generate a color based on the course name
  const getCourseColor = (courseName: string) => {
    // A list of pleasant, visually distinct colors
    const colorPalette = [
      "#4AA69D", // Teal
      "#F06292", // Pink
      "#7986CB", // Blue
      "#FFA726", // Orange
      "#9CCC65", // Light Green
      "#BA68C8", // Purple
      "#4DB6AC", // Light Teal
      "#FF8A65", // Coral
      "#AED581", // Lime
      "#FFD54F", // Amber
      "#81C784", // Green
      "#64B5F6", // Light Blue
      "#F8BBD0", // Light Pink
    ];

    // Simple hash function to generate a consistent index for each course name
    let hash = 0;
    for (let i = 0; i < courseName.length; i++) {
      hash = courseName.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Use modulo to get an index within the range of our color palette
    const index = Math.abs(hash) % colorPalette.length;
    return colorPalette[index];
  };

  useEffect(() => {
    if (!schedules || schedules.length === 0) return;

    const events: CalendarEvent[] = [];

    schedules.forEach((schedule) => {
      // Parse the time range
      const [startTimeStr, endTimeStr] = schedule.time.split(" - ");

      const getHourFromTimeStr = (timeStr: string) => {
        const [hourStr, minuteStr] = timeStr.split(":");
        let hour = parseInt(hourStr);
        const minute = parseInt(minuteStr) / 60; // Convert minutes to decimal

        // Adjust for 12-hour format if needed
        if (hour < 8) hour += 12; // Assuming classes after 8 PM are rare

        return hour + minute - 8; // Normalize to our grid (8am = index 0)
      };

      const startTime = getHourFromTimeStr(startTimeStr);
      const endTime = getHourFromTimeStr(endTimeStr);

      // Handle date patterns
      if (schedule.dates.includes(" - ") && schedule.dates.includes("(")) {
        // Handle date range with weekday pattern e.g., "2023-01-01 - 2023-05-01 (MWF)"
        const weekdayPattern = schedule.dates.split("(")[1].replace(")", "");

        // Map weekday abbreviations to array indices (M=0, T=1, W=2, R=3, F=4)
        if (weekdayPattern.includes("M"))
          events.push({
            dayIndex: 0,
            startTime,
            endTime,
            course: schedule.course,
            location: schedule.location,
            capacity: schedule.capacity,
            dates: schedule.dates,
          });
        if (weekdayPattern.includes("T") && !weekdayPattern.includes("R"))
          events.push({
            dayIndex: 1,
            startTime,
            endTime,
            course: schedule.course,
            location: schedule.location,
            capacity: schedule.capacity,
            dates: schedule.dates,
          });
        if (weekdayPattern.includes("W"))
          events.push({
            dayIndex: 2,
            startTime,
            endTime,
            course: schedule.course,
            location: schedule.location,
            capacity: schedule.capacity,
            dates: schedule.dates,
          });
        if (weekdayPattern.includes("R"))
          events.push({
            dayIndex: 3,
            startTime,
            endTime,
            course: schedule.course,
            location: schedule.location,
            capacity: schedule.capacity,
            dates: schedule.dates,
          });
        if (weekdayPattern.includes("F"))
          events.push({
            dayIndex: 4,
            startTime,
            endTime,
            course: schedule.course,
            location: schedule.location,
            capacity: schedule.capacity,
            dates: schedule.dates,
          });
      }
    });

    setCalendarEvents(events);
  }, [schedules]);

  // Update current time indicator using the provided currentDateTime
  useEffect(() => {
    const updateCurrentTimeIndicator = () => {
      const hours = currentDateTime.getHours();
      const minutes = currentDateTime.getMinutes();

      // Only show the line during calendar hours (8am to 8pm)
      if (hours >= 8 && hours <= 20) {
        // Calculate position: hours since 8am in rem units (2rem per hour)
        const position = (hours - 8 + minutes / 60) * 2;
        setCurrentTimePosition(position);
      } else {
        setCurrentTimePosition(null);
      }
    };

    // Update immediately
    updateCurrentTimeIndicator();

    // If using current time (not custom selected), set up an interval
    // to update every minute
    const isCurrentTime =
      new Date().getHours() === currentDateTime.getHours() &&
      new Date().getMinutes() === currentDateTime.getMinutes();

    let interval: NodeJS.Timeout | null = null;

    if (isCurrentTime) {
      interval = setInterval(updateCurrentTimeIndicator, 60000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [currentDateTime]);

  // Style for event elements
  const getEventStyle = (event: CalendarEvent): React.CSSProperties => {
    // Calculate position and height based on start/end times
    const top = `${event.startTime * 2}rem`; // 2rem per hour
    const height = `${(event.endTime - event.startTime) * 2}rem`;

    // Get a color based on the course name
    const bgColor = getCourseColor(event.course);

    return {
      position: "absolute",
      top,
      height,
      width: "90%",
      backgroundColor: bgColor,
      borderRadius: "0.25rem",
      padding: "0.25rem",
      color: "white",
      fontSize: "0.7rem",
      fontWeight: "bold",
      overflow: "hidden",
      opacity: "0.85",
      zIndex: 10,
      display: "flex",
      flexDirection: "column",
      justifyContent: "center", // Vertically center the text
      alignItems: "center", // Horizontally center the text
      cursor: "pointer",
      transition: "all 0.2s ease-in-out",
    };
  };

  const getCourseAbbreviation = (courseName: string): string => {
    // Extract the first letter and any numbers that follow
    const match = courseName.match(/^([A-Z])[^0-9]*([0-9]+)/i);
    if (match) {
      // Return first letter + number (e.g., "Computer Science 101" -> "C101")
      return `${match[1].toUpperCase()}${match[2]}`;
    }

    // Fallback: just return the first letter
    return courseName.charAt(0).toUpperCase();
  };

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setIsDrawerOpen(true);
  };

  const formatTimeRange = (startTime: number, endTime: number) => {
    const formatTime = (time: number) => {
      const hour = Math.floor(time) + 8; // Convert back from grid index to hour
      const minute = Math.round((time % 1) * 60);
      const period = hour >= 12 ? "PM" : "AM";
      const hour12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      return `${hour12}:${minute < 10 ? "0" + minute : minute} ${period}`;
    };

    return `${formatTime(startTime)} - ${formatTime(endTime)}`;
  };

  const getDayName = (dayIndex: number) => {
    const days = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ];
    return days[dayIndex];
  };

  // Get the current day of week as an index (0-6 where 0 is Monday)
  // This converts JavaScript's 0-6 where 0 is Sunday to our 0-6 where 0 is Monday
  const getCurrentDayIndex = () => {
    const jsDay = currentDateTime.getDay(); // 0 is Sunday, 1 is Monday, etc.
    return jsDay === 0 ? 6 : jsDay - 1; // Convert to 0 is Monday, 6 is Sunday
  };

  return (
    <TooltipProvider>
      <div className="flex flex-col space-y-2 w-full">
        <div className="w-full overflow-x-auto">
          {/* Days header */}
          <div className="grid grid-cols-8 border-b border-gray-800 w-full min-w-[240px]">
            <div className="py-1 text-center text-xs text-muted-foreground"></div>
            {weekDays.map((day, index) => (
              <div
                key={`day-${index}`}
                className={`flex items-center justify-center py-1 ${
                  index === getCurrentDayIndex()
                    ? "bg-[#2a3137] rounded-t-md"
                    : ""
                }`}
              >
                <span className="text-xs font-medium">{day}</span>
              </div>
            ))}
          </div>

          {/* Time grid */}
          <div
            className="grid grid-cols-8 w-full min-w-[240px] relative"
            ref={timeGridRef}
          >
            {/* Time labels */}
            <div className="border-r border-gray-800">
              {timeSlots.map((time) => (
                <div
                  key={time}
                  className="h-8 border-b border-gray-800 px-1 py-1"
                >
                  <span className="text-[10px] text-muted-foreground">
                    {time}
                  </span>
                </div>
              ))}
            </div>

            {/* Calendar cells with events */}
            {Array.from({ length: 7 }).map((_, dayIndex) => (
              <div
                key={dayIndex}
                className={`border-r border-gray-800 relative ${
                  dayIndex === getCurrentDayIndex()
                    ? "bg-[#2a3137] bg-opacity-40"
                    : ""
                }`}
              >
                {timeSlots.map((_, timeIndex) => (
                  <div
                    key={`${dayIndex}-${timeIndex}`}
                    className="h-8 border-b border-gray-800"
                  />
                ))}
                {/* Render events for this day */}
                {calendarEvents
                  .filter((event) => event.dayIndex === dayIndex)
                  .map((event, idx) => (
                    <Tooltip key={`event-${dayIndex}-${idx}`}>
                      <TooltipTrigger asChild>
                        <div
                          className="transition-transform hover:scale-105 hover:opacity-100 hover:shadow-md"
                          style={{ ...getEventStyle(event) }}
                          onClick={() => handleEventClick(event)}
                        >
                          <div className="font-semibold text-center">
                            {getCourseAbbreviation(event.course)}
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-medium">{event.course}</p>
                        <p className="text-xs">{event.location}</p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
              </div>
            ))}

            {/* Current time indicator line */}
            {currentTimePosition !== null && (
              <div
                className="absolute left-0 right-0 border-t border-red-500 z-20 pointer-events-none"
                style={{
                  top: `${currentTimePosition}rem`,
                  width: "100%",
                }}
              >
                <div
                  className="absolute -left-1 -top-1.5 w-3 h-3 rounded-full bg-red-500"
                  style={{ borderRadius: "50%" }}
                ></div>
              </div>
            )}
          </div>
        </div>

        {/* Drawer for detailed event view */}
        <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
          <DrawerContent className="px-4 mx-auto">
            {selectedEvent && (
              <>
                <DrawerHeader className="sm:text-center">
                  <DrawerTitle>{selectedEvent.course}</DrawerTitle>
                  <DrawerDescription>
                    {getDayName(selectedEvent.dayIndex)}s ·{" "}
                    {formatTimeRange(
                      selectedEvent.startTime,
                      selectedEvent.endTime
                    )}
                  </DrawerDescription>
                </DrawerHeader>
                <div className="grid gap-4 py-4 max-w-lg mx-auto w-full">
                  <div className="grid sm:grid-cols-4 grid-cols-1 items-center gap-2 sm:gap-4">
                    <span className="text-sm font-medium">Location:</span>
                    <span className="sm:col-span-3">
                      {selectedEvent.location}
                    </span>
                  </div>
                  <div className="grid sm:grid-cols-4 grid-cols-1 items-center gap-2 sm:gap-4">
                    <span className="text-sm font-medium">Capacity:</span>
                    <span className="sm:col-span-3">
                      {selectedEvent.capacity} students
                    </span>
                  </div>
                  <div className="grid sm:grid-cols-4 grid-cols-1 items-center gap-2 sm:gap-4">
                    <span className="text-sm font-medium">Dates:</span>
                    <span className="sm:col-span-3">{selectedEvent.dates}</span>
                  </div>
                </div>
              </>
            )}
          </DrawerContent>
        </Drawer>
      </div>
    </TooltipProvider>
  );
}
