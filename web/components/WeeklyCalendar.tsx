"use client";

import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

// Add types for schedules
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
}

export function WeeklyCalendar({ schedules = [] }: { schedules?: Schedule[] }) {
  // State for current week
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);

  // Day labels (starting with Monday)
  const weekDays = ["M", "T", "W", "R", "F", "Sa", "Su"];

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
          });
        if (weekdayPattern.includes("T") && !weekdayPattern.includes("R"))
          events.push({
            dayIndex: 1,
            startTime,
            endTime,
            course: schedule.course,
          });
        if (weekdayPattern.includes("W"))
          events.push({
            dayIndex: 2,
            startTime,
            endTime,
            course: schedule.course,
          });
        if (weekdayPattern.includes("R"))
          events.push({
            dayIndex: 3,
            startTime,
            endTime,
            course: schedule.course,
          });
        if (weekdayPattern.includes("F"))
          events.push({
            dayIndex: 4,
            startTime,
            endTime,
            course: schedule.course,
          });
      }
    });

    setCalendarEvents(events);
  }, [schedules]);

  const navigateWeek = (direction: number) => {
    setCurrentWeekOffset((prev) => prev + direction);
  };

  // Generate the current week's dates
  const getCurrentWeekDates = () => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust to get Monday

    // Apply week offset
    const mondayDate = new Date(today.setDate(diff + currentWeekOffset * 7));

    const startDate = new Date(mondayDate);
    const endDate = new Date(mondayDate);
    endDate.setDate(endDate.getDate() + 6);

    const startMonth = startDate.toLocaleString("default", { month: "short" });
    const endMonth = endDate.toLocaleString("default", { month: "short" });

    if (startMonth === endMonth) {
      return `${startMonth} ${startDate.getDate()} - ${endDate.getDate()}`;
    } else {
      return `${startMonth} ${startDate.getDate()} - ${endMonth} ${endDate.getDate()}`;
    }
  };

  // Style for event elements
  const getEventStyle = (event: CalendarEvent): React.CSSProperties => {
    // Calculate position and height based on start/end times
    const top = `${event.startTime * 2}rem`; // 2rem per hour
    const height = `${(event.endTime - event.startTime) * 2}rem`;

    // Determine background color (could be based on course type, etc.)
    const bgColor = "#4AA69D"; // Teal color for all events

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
      overflow: "hidden",
      opacity: "0.85",
      zIndex: 10,
    };
  };

  return (
    <div className="flex flex-col space-y-2 w-full">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">{getCurrentWeekDates()}</h2>
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => navigateWeek(-1)}
          >
            <ChevronLeft className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => navigateWeek(1)}
          >
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      </div>
      <div className="w-full overflow-x-auto">
        {/* Days header */}
        <div className="grid grid-cols-8 border-b w-full min-w-[240px]">
          <div className="py-1 text-center text-xs text-muted-foreground"></div>
          {weekDays.map((day, index) => (
            <div
              key={`day-${index}`}
              className="flex items-center justify-center py-1"
            >
              <span className="text-xs font-medium">{day}</span>
            </div>
          ))}
        </div>
        {/* Time grid */}
        <div className="grid grid-cols-8 w-full min-w-[240px]">
          {/* Time labels */}
          <div className="border-r">
            {timeSlots.map((time) => (
              <div key={time} className="h-8 border-b px-1 py-1">
                <span className="text-[10px] text-muted-foreground">
                  {time}
                </span>
              </div>
            ))}
          </div>
          {/* Calendar cells with events */}
          {Array.from({ length: 7 }).map((_, dayIndex) => (
            <div key={dayIndex} className="border-r relative">
              {timeSlots.map((_, timeIndex) => (
                <div
                  key={`${dayIndex}-${timeIndex}`}
                  className="h-8 border-b"
                />
              ))}

              {/* Render events for this day */}
              {calendarEvents
                .filter((event) => event.dayIndex === dayIndex)
                .map((event, idx) => (
                  <div
                    key={`event-${dayIndex}-${idx}`}
                    style={getEventStyle(event)}
                    title={event.course}
                  >
                    {event.course.length > 8
                      ? `${event.course.substring(0, 7)}...`
                      : event.course}
                  </div>
                ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
