import { Schedule, Building, BuildingData, Room, DisplaySettings } from "@/types";

// Check if a single room is available
export const isRoomAvailable = (
  schedules: Schedule[],
  currentDateTime: Date
): boolean => {
  // Get current date and time
  const now = currentDateTime;

  const currentTime = now.getHours() * 60 + now.getMinutes(); // Convert to minutes since midnight
  const currentDay = now.getDay();

  // Check each schedule
  for (const schedule of schedules) {
    // Parse the dates
    if (schedule.dates.includes(" - ")) {
      // Handle date range with weekday pattern
      const [dateRange, weekdays] = schedule.dates.split(" (");
      const [startDate, endDate] = dateRange
        .split(" - ")
        .map((d) => new Date(d));

      // Check if current date is within range
      if (now >= startDate && now <= endDate) {
        // Parse weekday pattern
        const weekdayPattern = weekdays.replace(")", "");
        const scheduledDays = new Set();

        if (weekdayPattern.includes("M")) scheduledDays.add(1); // Monday
        if (weekdayPattern.includes("T")) scheduledDays.add(2); // Tuesday
        if (weekdayPattern.includes("W")) scheduledDays.add(3); // Wednesday
        if (weekdayPattern.includes("R")) scheduledDays.add(4); // Thursday
        if (weekdayPattern.includes("F")) scheduledDays.add(5); // Friday

        // Check if class runs on current day
        if (scheduledDays.has(currentDay)) {
          // Parse time range
          const [startTime, endTime] = schedule.time.split(" - ").map((t) => {
            const [hours, minutes] = t.split(":").map(Number);
            return hours * 60 + minutes;
          });

          // Check if current time falls within class time
          if (currentTime >= startTime && currentTime <= endTime) {
            return false; // Room is occupied
          }
        }
      }
    } else {
      // Handle single date
      const scheduleDate = new Date(schedule.dates);

      // Check if it's the same day
      if (
        scheduleDate.getFullYear() === now.getFullYear() &&
        scheduleDate.getMonth() === now.getMonth() &&
        scheduleDate.getDate() === now.getDate()
      ) {
        // Parse time range
        const [startTime, endTime] = schedule.time.split(" - ").map((t) => {
          const [hours, minutes] = t.split(":").map(Number);
          return hours * 60 + minutes;
        });

        // Check if current time falls within class time
        if (currentTime >= startTime && currentTime <= endTime) {
          return false; // Room is occupied
        }
      }
    }
  }

  return true; // Room is available if no conflicting schedules found
};

// Get available room count for a building
export const getAvailableRoomCount = (
  building: Building,
  currentDateTime: Date
): number => {
  return Object.values(building.rooms).reduce((count, schedules) => {
    return count + (isRoomAvailable(schedules, currentDateTime) ? 1 : 0);
  }, 0);
};

// Get availability ratio for a building
export const getBuildingAvailabilityRatio = (
  building: Building,
  currentDateTime: Date
): number => {
  const totalRooms = Object.keys(building.rooms).length;
  const availableRooms = getAvailableRoomCount(building, currentDateTime);
  return totalRooms > 0 ? availableRooms / totalRooms : 0;
};

// Check if a building matches the current availability filter
export const buildingMatchesDisplaySettings = (
  building: Building,
  displaySettings: DisplaySettings,
  currentDateTime: Date
): boolean => {
  const availabilityRatio = getBuildingAvailabilityRatio(
    building,
    currentDateTime
  );

  switch (displaySettings) {
    case "available":
      return availabilityRatio >= 0.5;
    case "limited":
      return availabilityRatio >= 0.25 && availabilityRatio < 0.5;
    case "unavailable":
      return availabilityRatio < 0.25;
    case "all":
    default:
      return true;
  }
};

// Filter buildings and rooms based on search query and availability filter
export const filterBuildingData = (
  buildingData: BuildingData | null,
  searchQuery: string,
  displaySettings: DisplaySettings,
  currentDateTime: Date
): BuildingData | null => {
  if (!buildingData) return null;

  return Object.entries(buildingData).reduce(
    (acc, [buildingName, building]) => {
      // First check if building matches availability filter
      if (
        !buildingMatchesDisplaySettings(
          building,
          displaySettings,
          currentDateTime
        )
      ) {
        return acc;
      }

      // Check if building name matches search query
      const buildingMatches = buildingName
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

      // Filter rooms that match the search query (only by room name, not by class name)
      const matchingRooms = Object.entries(building.rooms).reduce(
        (roomAcc, [roomName, schedules]) => {
          if (roomName.toLowerCase().includes(searchQuery.toLowerCase())) {
            roomAcc[roomName] = schedules;
          }
          return roomAcc;
        },
        {} as Room
      );

      // Include building if either the building name matches or there are matching rooms
      if (buildingMatches || Object.keys(matchingRooms).length > 0) {
        acc[buildingName] = {
          ...building,
          rooms: buildingMatches ? building.rooms : matchingRooms,
        };
      }
      return acc;
    },
    {} as BuildingData
  );
};

// Helper function to convert time string to minutes since midnight
export const timeToMinutes = (timeStr: string): number => {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
};
