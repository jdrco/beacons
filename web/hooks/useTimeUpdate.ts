import { useTime } from "@/contexts/TimeContext";

export function useTimeUpdate() {
  // Just return the current time from the TimeContext
  const { currentTime } = useTime();
  return currentTime;
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
