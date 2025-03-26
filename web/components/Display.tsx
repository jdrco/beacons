"use client";

import {
  // Heart,
  Building2,
  DoorOpen,
  DoorClosed,
  ChevronDown,
  Plus,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import Map from "./Map";
import { WeeklyCalendar } from "./WeeklyCalendar";
import { getAvailabilityColor } from "@/lib/utils";
import {
  isRoomAvailable,
  getAvailableRoomCount,
  filterBuildingData,
  timeToMinutes,
} from "@/lib/availability";
import { useBuildingData } from "@/hooks/useBuildingData";
import { useTimeUpdate } from "@/hooks/useTimeUpdate";
import { useBuildingSelection } from "@/hooks/useBuildingSelection";
import { DisplaySettings } from "@/types";
import Navbar from "./Navbar";

export default function Display() {
  const [buildingData, setBuildingData] = useState<BuildingData | null>(null);
  // const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [displaySettings, setDisplaySettings] =
    useState<DisplaySettings>("all");
  const [currentDateTime, setCurrentDateTime] = useState<Date>(new Date());
  const [expandedAccordionItems, setExpandedAccordionItems] = useState<
    string[]
  >([]);
  const accordionContainerRef = useRef<HTMLDivElement>(null);
  const buildingItemRefs = useRef<{ [key: string]: HTMLElement | null }>({});
  const [showMapTooltip, setShowMapTooltip] = useState<boolean>(true);

  // Check if a single room is available
  const isRoomAvailable = (schedules: Schedule[]): boolean => {
    // Get current date and time
    const now = currentDateTime;

    const currentTime = now.getHours() * 60 + now.getMinutes(); // Convert to minutes since midnight
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

  // Get available room count for a building
  const getAvailableRoomCount = (building: Building): number => {
    return Object.values(building.rooms).reduce((count, schedules) => {
      return count + (isRoomAvailable(schedules) ? 1 : 0);
    }, 0);
  };

  // Get availability ratio for a building
  const getBuildingAvailabilityRatio = (building: Building): number => {
    const totalRooms = Object.keys(building.rooms).length;
    const availableRooms = getAvailableRoomCount(building);
    return totalRooms > 0 ? availableRooms / totalRooms : 0;
  };

  // Check if a building matches the current availability filter
  const buildingMatchesDisplaySettings = (building: Building): boolean => {
    const availabilityRatio = getBuildingAvailabilityRatio(building);

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
  const filteredBuildingData = buildingData
    ? Object.entries(buildingData).reduce((acc, [buildingName, building]) => {
        // First check if building matches availability filter
        if (!buildingMatchesDisplaySettings(building)) {
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

  useEffect(() => {
    // This empty effect with searchQuery dependency helps isolate search state updates
    // from time-related state updates
  }, [searchQuery]);

  // const toggleFavorite = (e: React.MouseEvent, roomId: string) => {
  //   e.stopPropagation();
  //   setFavorites((prev) =>
  //     prev.includes(roomId)
  //       ? prev.filter((id) => id !== roomId)
  //       : [...prev, roomId]
  //   );
  // };

  // Helper function to convert time string to minutes since midnight
  const timeToMinutes = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours * 60 + minutes;
  };

  // Handle building selection from map or accordion
  const handleBuildingSelect = (buildingName: string) => {
    // Check if we're toggling the already selected building
    const isToggling =
      selectedBuilding === buildingName &&
      expandedAccordionItems.includes(buildingName);

    // Always update selected building first
    setSelectedBuilding(buildingName);

    if (isToggling) {
      // If we're collapsing, update the accordion state without scrolling
      setExpandedAccordionItems([]);
      // Also hide the tooltip when collapsing
      setShowMapTooltip(false);
    } else {
      // First collapse all
      setExpandedAccordionItems([]);

      // Show the tooltip
      setShowMapTooltip(true);

      // Then use a longer delay before expanding
      setTimeout(() => {
        // Expand the selected building
        setExpandedAccordionItems([buildingName]);

        // Add a much longer delay for scrolling on mobile
        const scrollDelay = window.innerWidth < 768 ? 500 : 300;

        setTimeout(() => {
          if (
            buildingItemRefs.current[buildingName] &&
            accordionContainerRef.current
          ) {
            const container = accordionContainerRef.current;
            const element = buildingItemRefs.current[buildingName];

            if (element) {
              // On mobile, use a simpler approach - just scroll the element into view
              if (window.innerWidth < 768) {
                element.scrollIntoView({ behavior: "smooth", block: "start" });
              } else {
                // On desktop, use the original approach with padding
                const scrollPosition = element.offsetTop - 120;
                container.scrollTo({
                  top: Math.max(0, scrollPosition),
                  behavior: "smooth",
                });
              }
            }
          }
        }, scrollDelay);
      }, 100); // Slightly longer initial delay
    }
  };

  if (loading)
    return (
      <div className="w-screen h-screen flex justify-center items-center">
        <img
          src="/beacons_logo_load.svg"
          alt="Loading"
          className="animate-spin w-12 h-12"
        />
        <div className="p-4 text-white">Loading data...</div>
      </div>
    );
  if (error) return <div className="p-4 text-red-500">{error}</div>;
  if (!buildingData) return null;

  return (
    <div className="flex flex-col h-full w-full gap-y-3 md:gap-y-6  max-h-screen overflow-hidden">
      <Navbar
        setSearchQuery={setSearchQuery}
        setDisplaySettings={setDisplaySettings}
        displaySettings={displaySettings}
        currentDateTime={currentDateTime}
      />
      <div className="h-full w-full flex flex-col md:flex-row gap-3 md:gap-x-8 min-h-0">
        {/* <div className="md:w-1/3 bg-red-400 h-full "></div> */}
        <Map
          buildingData={filteredBuildingData || undefined}
          isRoomAvailable={isRoomAvailable}
          onBuildingClick={handleBuildingSelect}
          selectedBuilding={selectedBuilding}
          currentDateTime={currentDateTime}
          showTooltip={showMapTooltip}
          className="w-full md:w-2/3 h-[600px] md:h-full rounded-xl md:rounded-2xl"
        />
        <div className="flex flex-col items-center w-full md:w-1/3 h-full overflow-hidden gap-4">
          <Accordion
            type="multiple"
            className="w-full h-full overflow-y-auto"
            value={expandedAccordionItems}
            onValueChange={setExpandedAccordionItems}
            ref={accordionContainerRef}
          >
            {Object.entries(filteredBuildingData || {}).map(
              ([buildingName, building]) => (
                <AccordionItem
                  key={buildingName}
                  value={buildingName}
                  ref={(el) => {
                    buildingItemRefs.current[buildingName] = el as HTMLElement;
                  }}
                >
                  <AccordionTrigger
                    className="flex items-center justify-between px-3 py-4 hover:bg-[#2a3137] hover:no-underline transition-colors data-[state=open]:bg-[#2a3137]"
                    onClick={(e) => {
                      // Prevent the default accordion behavior
                      e.preventDefault();
                      handleBuildingSelect(buildingName);
                    }}
                    rightElement={
                      <>
                        <div className="flex items-end">
                          <div className="flex items-center gap-2">
                            {(() => {
                              const totalRooms = Object.keys(
                                building.rooms
                              ).length;
                              const availableRooms =
                                getAvailableRoomCount(building);
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
                    <Accordion type="multiple" className="mx-4">
                      {Object.entries(building.rooms).map(
                        ([roomName, schedules]) => {
                          const isAvailable = isRoomAvailable(schedules);
                          return (
                            <AccordionItem key={roomName} value={roomName}>
                              <AccordionTrigger
                                className="flex items-center justify-between px-3 py-5 hover:no-underline"
                                rightElement={
                                  <Plus className="shrink-0 transition-transform duration-200" />
                                }
                                usePlusMinusToggle={true}
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
                                <div className="space-y-4">
                                  {/* Weekly calendar integration */}
                                  <div className="border border-gray-700 rounded-lg p-3 bg-[#1e2329]">
                                    <WeeklyCalendar
                                      schedules={schedules}
                                      currentDateTime={currentDateTime}
                                    />
                                  </div>

                                  {/* Original schedule details */}
                                  <div className="space-y-2 text-sm text-gray-300">
                                    <h2 className="text-sm font-bold">
                                      Schedule Details
                                    </h2>
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
                                          <div
                                            key={index}
                                            className="space-y-1"
                                          >
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
