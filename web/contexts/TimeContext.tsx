"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

interface TimeContextType {
  currentTime: Date;
  isCustomTime: boolean;
  setCustomTime: (date: Date | undefined) => void;
  resetToRealTime: () => void;
}

const TimeContext = createContext<TimeContextType | undefined>(undefined);

interface TimeProviderProps {
  children: ReactNode;
}

export function TimeProvider({ children }: TimeProviderProps) {
  // State to track if we're using custom time or real time
  const [isCustomTime, setIsCustomTime] = useState<boolean>(false);
  // Current time (either real or custom)
  const [currentTime, setCurrentTime] = useState<Date>(
    adjustToEdmontonTime(new Date())
  );

  // Function to convert any date to Edmonton time
  function adjustToEdmontonTime(date: Date): Date {
    // Edmonton is in MST (UTC-7) or MDT (UTC-6)
    const edmontonTimeZone = "America/Edmonton";

    // Create a formatter in the Edmonton timezone
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: edmontonTimeZone,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: false,
    });

    // Get the parts
    const parts = formatter.formatToParts(date);

    // Extract the values
    const year = parseInt(
      parts.find((part) => part.type === "year")?.value || "0"
    );
    const month =
      parseInt(parts.find((part) => part.type === "month")?.value || "0") - 1;
    const day = parseInt(
      parts.find((part) => part.type === "day")?.value || "0"
    );
    const hour = parseInt(
      parts.find((part) => part.type === "hour")?.value || "0"
    );
    const minute = parseInt(
      parts.find((part) => part.type === "minute")?.value || "0"
    );
    const second = parseInt(
      parts.find((part) => part.type === "second")?.value || "0"
    );

    // Create a new date in the local timezone but with Edmonton time values
    return new Date(year, month, day, hour, minute, second);
  }

  // Set custom time
  const setCustomTime = (date: Date | undefined) => {
    if (date) {
      setCurrentTime(date);
      setIsCustomTime(true);
    }
  };

  // Reset to real time
  const resetToRealTime = () => {
    setIsCustomTime(false);
    setCurrentTime(adjustToEdmontonTime(new Date()));
  };

  // Update the time periodically when not using custom time
  useEffect(() => {
    if (!isCustomTime) {
      const calculateNextUpdateTime = () => {
        const now = new Date();
        const seconds = now.getSeconds();

        // Update on the minute
        const millisecondsToNextMinute = (60 - seconds) * 1000;
        return millisecondsToNextMinute;
      };

      const scheduleNextUpdate = () => {
        const delay = calculateNextUpdateTime();

        const timerId = setTimeout(() => {
          setCurrentTime(adjustToEdmontonTime(new Date()));
          scheduleNextUpdate();
        }, delay);

        return () => clearTimeout(timerId);
      };

      const cleanup = scheduleNextUpdate();
      return cleanup;
    }
  }, [isCustomTime]);

  const contextValue: TimeContextType = {
    currentTime,
    isCustomTime,
    setCustomTime,
    resetToRealTime,
  };

  return (
    <TimeContext.Provider value={contextValue}>{children}</TimeContext.Provider>
  );
}

export function useTime(): TimeContextType {
  const context = useContext(TimeContext);
  if (context === undefined) {
    throw new Error("useTime must be used within a TimeProvider");
  }
  return context;
}
