"use client";

import {
  Heart,
  Building2,
  DoorOpen,
  DoorClosed,
  ChevronDown,
  Plus,
} from "lucide-react";
import { useState, useEffect } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import Map from "./Map";
import SearchBar from "./Search";

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
  const [searchQuery, setSearchQuery] = useState("");

  // Filter buildings and rooms based on search query
  const filteredBuildingData = buildingData
    ? Object.entries(buildingData).reduce((acc, [buildingName, building]) => {
        const matchingRooms = Object.entries(building.rooms).reduce(
          (roomAcc, [roomName, schedules]) => {
            if (
              roomName.toLowerCase().includes(searchQuery.toLowerCase()) ||
              schedules.some((schedule) =>
                schedule.course
                  .toLowerCase()
                  .includes(searchQuery.toLowerCase())
              )
            ) {
              roomAcc[roomName] = schedules;
            }
            return roomAcc;
          },
          {} as Room
        );

        if (
          buildingName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          Object.keys(matchingRooms).length > 0
        ) {
          acc[buildingName] = {
            ...building,
            rooms: matchingRooms,
          };
        }
        return acc;
      }, {} as BuildingData)
    : null;

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

    // const currentTime = 14 * 60 + 30; // 2:30 PM
    // const currentDay = 3; // Wednesday

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

  // Helper function to convert time string to minutes since midnight
  const timeToMinutes = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours * 60 + minutes;
  };

  const getAvailabilityColor = (
    availableRooms: number,
    totalRooms: number
  ): string => {
    const ratio = availableRooms / totalRooms;
    if (ratio >= 0.5) return "#4AA69D"; // green
    if (ratio >= 0.25) return "#DDAA5E"; // yellow
    return "#F66A6A"; // red
  };

  const getAvailableRoomCount = (
    building: Building,
    isRoomAvailable: (schedules: Schedule[]) => boolean
  ): number => {
    return Object.values(building.rooms).reduce((count, schedules) => {
      return count + (isRoomAvailable(schedules) ? 1 : 0);
    }, 0);
  };

  return (
    <div className="flex flex-col h-full w-full gap-2 md:gap-4 max-h-screen overflow-hidden">
      <div className="flex flex-col md:flex-row w-full gap-2 md:gap-4">
        <div className="flex gap-2 md:gap-4 md:w-2/3 order-last md:order-first">
          <SearchBar onSearch={setSearchQuery} />
          <button className="flex items-center h-full border border-[#4AA69D] rounded-xl md:rounded-2xl">
            <SlidersHorizontal className="mx-2 p-1 md:p-0 md:mx-4 h-6 w-6 text-gray-400" />
          </button>
        </div>
        <div className="order-first md:order-last flex justify-center items-center md:w-1/3">
          <img
            src="/beacons_logo.svg"
            alt="Beacons Logo"
            className="hidden md:block next-image-unconstrained md:h-10 h-6"
          />
        </div>
      </div>
      <div className="h-full w-full flex flex-col md:flex-row gap-2 md:gap-4 min-h-0">
        <Map
          buildingData={buildingData}
          isRoomAvailable={isRoomAvailable}
          onBuildingClick={setSelectedBuilding}
          selectedBuilding={selectedBuilding}
          className="w-full md:w-2/3 h-full rounded-xl md:rounded-2xl"
        />
        {/* <div className="bg-red-200 w-full md:w-2/3 h-full rounded-xl md:rounded-2xl"></div> */}
        <div className="flex flex-col items-center w-full md:w-1/3 h-full overflow-hidden gap-4">
          <Accordion type="multiple" className="w-full h-full overflow-y-auto">
            {Object.entries(filteredBuildingData || {}).map(
              ([buildingName, building]) => (
                <AccordionItem key={buildingName} value={buildingName}>
                  <AccordionTrigger
                    className="flex items-center justify-between px-3 py-4 hover:bg-[#2a3137] hover:no-underline transition-colors data-[state=open]:bg-[#2a3137]"
                    onClick={() =>
                      setSelectedBuilding(
                        selectedBuilding === buildingName ? null : buildingName
                      )
                    }
                    rightElement={
                      <>
                        <div className="flex items-end">
                          <div className="flex items-center gap-2">
                            {(() => {
                              const totalRooms = Object.keys(
                                building.rooms
                              ).length;
                              const availableRooms = getAvailableRoomCount(
                                building,
                                isRoomAvailable
                              );
                              const backgroundColor = getAvailabilityColor(
                                availableRooms,
                                totalRooms
                              );

                              return (
                                <span
                                  className="flex justify-center items-center gap-2 w-20 py-1 rounded-full text-sm text-white"
                                  style={{ backgroundColor }}
                                >
                                  <div className="flex items-center h-4">
                                    <DoorOpen
                                      className="h-full w-auto"
                                      strokeWidth={2}
                                    />
                                  </div>
                                  <span className="leading-4">
                                    {availableRooms}/{totalRooms}
                                  </span>
                                </span>
                              );
                            })()}
                          </div>
                        </div>
                        <ChevronDown className="shrink-0 transition-transform duration-200 chevron-icon" />
                      </>
                    }
                  >
                    <div className="flex items-center gap-3">
                      <Building2 className="w-6 h-6" />
                      <span className="text-xl">{buildingName}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <Accordion type="multiple" className="ml-8">
                      {Object.entries(building.rooms).map(
                        ([roomName, schedules]) => {
                          const isAvailable = isRoomAvailable(schedules);
                          return (
                            <AccordionItem key={roomName} value={roomName}>
                              <AccordionTrigger
                                className="flex items-center justify-between px-3 py-5 hover:no-underline"
                                rightElement={
                                  <>
                                    {/* <button
                                      onClick={(e) =>
                                        toggleFavorite(e, roomName)
                                      }
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
                                    </button> */}
                                    <Plus className="shrink-0 transition-transform duration-200 chevron-icon" />
                                  </>
                                }
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-6 h-6">
                                    {isAvailable ? (
                                      <DoorOpen className="stroke-[#4AA69D]" />
                                    ) : (
                                      <DoorClosed className="stroke-[#f56565]" />
                                    )}
                                  </div>
                                  <span className="text-lg">{roomName}</span>
                                </div>
                              </AccordionTrigger>

                              <AccordionContent className="mt-2">
                                <div className="ml-9 space-y-2 text-sm text-gray-300">
                                  <p className="font-medium">M T W R F</p>
                                  <div className="space-y-2">
                                    {[...schedules]
                                      .sort((a, b) => {
                                        const timeA = timeToMinutes(
                                          a.time.split(" - ")[0]
                                        );
                                        const timeB = timeToMinutes(
                                          b.time.split(" - ")[0]
                                        );
                                        return timeA - timeB;
                                      })
                                      .map((schedule, index) => (
                                        <div key={index} className="space-y-1">
                                          <p>Course: {schedule.course}</p>
                                          <p>Dates: {schedule.dates}</p>
                                          <p>Time: {schedule.time}</p>
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
              )
            )}
          </Accordion>
        </div>
      </div>
    </div>
  );
}
