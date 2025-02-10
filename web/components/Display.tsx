"use client";

import { Heart, Building2, DoorOpen, DoorClosed } from "lucide-react";
import { useState, useEffect } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface Coordinates {
  latitude: number;
  longitude: number;
}

interface Schedule {
  dates: string;
  time: string;
  location: string;
  capacity: number;
  course: string;
}

interface Room {
  [roomName: string]: Schedule[];
}

interface Building {
  coordinates: Coordinates;
  rooms: Room;
}

interface BuildingData {
  [buildingName: string]: Building;
}

export default function RoomBooking() {
  const [buildingData, setBuildingData] = useState<BuildingData | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<string | null>(null);

  useEffect(() => {
    const fetchBuildingData = async () => {
      try {
        const response = await fetch("/processed_classroom_availability.json");
        if (!response.ok) {
          throw new Error("Failed to fetch building data");
        }
        const data: BuildingData = await response.json();
        setBuildingData(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load building data"
        );
      } finally {
        setLoading(false);
      }
    };
    fetchBuildingData();
  }, []);

  const toggleFavorite = (e: React.MouseEvent, roomId: string) => {
    e.stopPropagation();
    setFavorites((prev) =>
      prev.includes(roomId)
        ? prev.filter((id) => id !== roomId)
        : [...prev, roomId]
    );
  };

  // Check if a single room is available
  const isRoomAvailable = (schedules: Schedule[]): boolean => {
    // Get current date and time
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes(); // Convert to minutes since midnight

    // Get current day of week (0 = Sunday, 1 = Monday, etc.)
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
          if (weekdayPattern.includes("T") && !weekdayPattern.includes("R"))
            scheduledDays.add(2); // Tuesday
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

  // Check if a building has any available rooms
  const isBuildingAvailable = (building: Building): boolean => {
    // Check each room in the building
    for (const roomSchedules of Object.values(building.rooms)) {
      if (isRoomAvailable(roomSchedules)) {
        return true; // Building is available if at least one room is available
      }
    }
    return false; // Building is busy if all rooms are occupied
  };

  if (loading)
    return <div className="p-4 text-white">Loading building data...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;
  if (!buildingData) return null;

  return (
    <div className="flex w-screen gap-4 p-4">
      <div className="h-full bg-gray-100 rounded-lg mb-4 flex items-center justify-center text-gray-700 w-2/3">
        Map Coming Soon
        {selectedBuilding && buildingData[selectedBuilding] && (
          <div className="ml-2">
            Selected: {selectedBuilding} (
            {buildingData[selectedBuilding].coordinates.latitude.toFixed(6)},
            {buildingData[selectedBuilding].coordinates.longitude.toFixed(6)})
          </div>
        )}
      </div>
      <div className="w-1/3 h-full overflow-hidden">
        <Accordion
          type="multiple"
          className="space-y-2 w-full h-full overflow-y-auto"
        >
          {Object.entries(buildingData).map(([buildingName, building]) => (
            <AccordionItem
              key={buildingName}
              value={buildingName}
              className="border-0"
            >
              <AccordionTrigger
                className="flex items-center justify-between p-3 rounded-lg hover:bg-[#2a3137] hover:no-underline transition-colors data-[state=open]:bg-[#2a3137]"
                onClick={() =>
                  setSelectedBuilding(
                    selectedBuilding === buildingName ? null : buildingName
                  )
                }
              >
                <div className="flex items-center gap-3">
                  <Building2 className="w-6 h-6" />
                  <span className="text-lg">{buildingName}</span>
                </div>
                <div className="flex items-end">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-1 rounded-full text-sm mr-2 ${
                        isBuildingAvailable(building)
                          ? "bg-[#4fd1c5] text-black"
                          : "bg-[#f56565] text-white"
                      }`}
                    >
                      {isBuildingAvailable(building) ? (
                        <span>free &#x1F440;</span>
                      ) : (
                        <span>busy &#9203;</span>
                      )}
                    </span>
                    <span className="text-sm text-gray-400">
                      {Object.keys(building.rooms).length} rooms
                    </span>
                  </div>
                </div>
              </AccordionTrigger>

              <AccordionContent className="mt-2">
                <Accordion type="multiple" className="ml-8 space-y-2">
                  {Object.entries(building.rooms).map(
                    ([roomName, schedules]) => {
                      const isAvailable = isRoomAvailable(schedules);
                      return (
                        <AccordionItem
                          key={roomName}
                          value={roomName}
                          className="border-0"
                        >
                          <AccordionTrigger className="flex items-center justify-between p-3 rounded-lg hover:bg-[#2a3137] hover:no-underline transition-colors data-[state=open]:bg-[#2a3137]">
                            <div className="flex items-center gap-3">
                              <div className="w-6 h-6">
                                {isAvailable ? (
                                  <DoorOpen className="stroke-[#4fd1c5]" />
                                ) : (
                                  <DoorClosed className="stroke-[#f56565]" />
                                )}
                              </div>
                              <span>{roomName}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => toggleFavorite(e, roomName)}
                                className="hover:text-gray-300"
                              >
                                <Heart
                                  size={20}
                                  fill={
                                    favorites.includes(roomName)
                                      ? "currentColor"
                                      : "none"
                                  }
                                />
                              </button>
                            </div>
                          </AccordionTrigger>

                          <AccordionContent className="mt-2">
                            <div className="ml-9 space-y-2 text-sm text-gray-300">
                              <p className="font-medium">Schedule</p>
                              <div className="space-y-2">
                                {schedules.map((schedule, index) => (
                                  <div key={index} className="space-y-1">
                                    <p>Course: {schedule.course}</p>
                                    <p>Dates: {schedule.dates}</p>
                                    <p>Time: {schedule.time}</p>
                                    <p>Capacity: {schedule.capacity}</p>
                                    {index < schedules.length - 1 && (
                                      <hr className="border-gray-700 my-2" />
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    }
                  )}
                </Accordion>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
}
