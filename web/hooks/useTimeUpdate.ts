import { useState, useEffect } from "react";

export function useTimeUpdate() {
  const [currentDateTime, setCurrentDateTime] = useState<Date>(new Date());

  useEffect(() => {
    const calculateNextUpdateTime = () => {
      const now = new Date();
      const minutes = now.getMinutes();
      const seconds = now.getSeconds();

      // Determine next update point (00, 20, 30, or 50 minutes)
      let nextMinute;
      if (minutes < 20) nextMinute = 20;
      else if (minutes < 30) nextMinute = 30;
      else if (minutes < 50) nextMinute = 50;
      else nextMinute = 60; // Next hour

      // Calculate milliseconds until next update
      const millisecondsToNextUpdate =
        ((nextMinute - minutes) * 60 - seconds) * 1000;

      return millisecondsToNextUpdate;
    };

    // Function to schedule the next update
    const scheduleNextUpdate = () => {
      const delay = calculateNextUpdateTime();

      // Set timeout for next update
      const timerId = setTimeout(() => {
        // Update the current time to trigger recalculation
        setCurrentDateTime(new Date());
        // Schedule the next update
        scheduleNextUpdate();
      }, delay);

      // Clean up timeout on component unmount
      return () => clearTimeout(timerId);
    };

    // Start the scheduling chain
    const cleanup = scheduleNextUpdate();

    return cleanup;
  }, []);

  return currentDateTime;
}

// For hardcoded time
// import { useState, useEffect } from "react";

// export function useTimeUpdate() {
//   const [currentDateTime, _] = useState<Date>(new Date("2025-03-26T11:00:00"));

//   useEffect(() => {
//     // Keep the hardcoded date, no updates needed
//   }, []);

//   return currentDateTime;
// }
