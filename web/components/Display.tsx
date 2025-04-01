"use client";

import { Building2, DoorOpen, DoorClosed, ChevronDown } from "lucide-react";
import { useState, useRef } from "react";
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
import FavoriteButton from "./FavoriteButton";
import { useAuth } from "@/contexts/AuthContext";
import { useFavorites } from "@/hooks/useFavorites";

export default function Display() {
  // Get building data from custom hook
  const { buildingData, loading, error } = useBuildingData();

  // State for search and display settings
  const [searchQuery, setSearchQuery] = useState("");
  const [displaySettings, setDisplaySettings] =
    useState<DisplaySettings>("all");

  // Get current time from custom hook
  const currentDateTime = useTimeUpdate();

  // Refs for accordion items
  const accordionContainerRef = useRef<HTMLDivElement>(null);
  const buildingItemRefs = useRef<{ [key: string]: HTMLElement | null }>({});

  // Building selection state from custom hook
  const {
    selectedBuilding,
    expandedAccordionItems,
    showMapTooltip,
    setExpandedAccordionItems,
    handleBuildingSelect,
  } = useBuildingSelection({ accordionContainerRef, buildingItemRefs });

  // Authentication and favorites
  const { isAuthenticated } = useAuth();
  const { favorites, toggleFavorite } = useFavorites();

  // Filter buildings based on search and display settings
  const filteredBuildingData = filterBuildingData(
    buildingData,
    searchQuery,
    displaySettings,
    currentDateTime
  );

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
    <div className="flex flex-col h-full w-full gap-y-3 md:gap-y-4 max-h-screen overflow-hidden">
      <Navbar
        setSearchQuery={setSearchQuery}
        setDisplaySettings={setDisplaySettings}
        displaySettings={displaySettings}
        currentDateTime={currentDateTime}
      />
      <div className="h-full w-full flex flex-col md:flex-row px-3 md:px-4 pb-4 gap-3 md:gap-4 min-h-0">
        <Map
          buildingData={filteredBuildingData || undefined}
          isRoomAvailable={(schedules) =>
            isRoomAvailable(schedules, currentDateTime)
          }
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
                              const availableRooms = getAvailableRoomCount(
                                building,
                                currentDateTime
                              );
                              const backgroundColor = getAvailabilityColor(
                                availableRooms,
                                totalRooms
                              );

                              return (
                                <span
                                  className="flex justify-center items-center gap-2 w-20 py-1 rounded-full text-sm text-white"
                                  style={{
                                    backgroundColor,
                                  }}
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
                          const roomAvailable = isRoomAvailable(
                            schedules,
                            currentDateTime
                          );
                          return (
                            <AccordionItem key={roomName} value={roomName}>
                              <AccordionTrigger
                                className="flex items-center justify-between px-3 py-5 hover:no-underline"
                                usePlusMinusToggle={true}
                                additionalControls={
                                  isAuthenticated ? (
                                    <FavoriteButton
                                      roomName={roomName}
                                      isFavorite={favorites.includes(roomName)}
                                      onToggle={toggleFavorite}
                                    />
                                  ) : null
                                }
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-6 h-6">
                                    {roomAvailable ? (
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
