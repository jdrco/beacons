"use client";

import {
  Building2,
  DoorOpen,
  DoorClosed,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import ToggleCheckInButton from "./ToggleCheckInButton";
import ActivityFeed from "./ActivityFeed";
import { useAuth } from "@/contexts/AuthContext";
import { useCheckIn } from "@/hooks/useCheckIn";
import { useFavorites } from "@/hooks/useFavorites";
import Logo from "@/components/Logo";
import { useLocation } from "@/hooks/useLocation";
import { toast } from "@/hooks/use-toast";
import OccupancyBadge from "./OccupancyBadge";

export default function Display() {
  // Get building data from custom hook
  const { buildingData, loading, error } = useBuildingData();

  // Get occupancy and check-in data from CheckInContext
  const { roomOccupancy, getBuildingOccupancy } = useCheckIn();

  // State for search and display settings
  const [searchQuery, setSearchQuery] = useState("");
  const [displaySettings, setDisplaySettings] =
    useState<DisplaySettings>("all");

  // Tab state - default to "rooms"
  const [activeTab, setActiveTab] = useState("rooms");

  // Get current time from custom hook
  const currentDateTime = useTimeUpdate();

  // Get user location and building distances
  const location = useLocation();

  // State for sorting mode
  const [sortByDistance, setSortByDistance] = useState(false);

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

  // Calculate distances when location and buildingData are available
  useEffect(() => {
    if (
      sortByDistance &&
      location.latitude &&
      location.longitude &&
      buildingData
    ) {
      location.calculateDistances(buildingData);
    }
  }, [location.latitude, location.longitude, buildingData, sortByDistance]);

  // Sort buildings by distance if sortByDistance is true
  const getSortedBuildingEntries = () => {
    const entries = Object.entries(filteredBuildingData || {});

    if (sortByDistance && Object.keys(location.buildingDistances).length > 0) {
      return entries.sort((a, b) => {
        // First prioritize by availability if that's the current filter
        if (displaySettings === "available") {
          const aAvailableCount = getAvailableRoomCount(a[1], currentDateTime);
          const bAvailableCount = getAvailableRoomCount(b[1], currentDateTime);
          const aTotalRooms = Object.keys(a[1].rooms).length;
          const bTotalRooms = Object.keys(b[1].rooms).length;

          const aAvailPercent = aAvailableCount / aTotalRooms;
          const bAvailPercent = bAvailableCount / bTotalRooms;

          if (aAvailPercent !== bAvailPercent) {
            return bAvailPercent - aAvailPercent; // Higher availability first
          }
        }

        // Then sort by distance
        const distanceA = location.buildingDistances[a[0]] || Number.MAX_VALUE;
        const distanceB = location.buildingDistances[b[0]] || Number.MAX_VALUE;
        return distanceA - distanceB;
      });
    }

    return entries;
  };

  if (loading)
    return (
      <div className="flex w-screen h-screen flex-col justify-center items-center">
        <Logo />
        <div className="flex items-center gap-2 mt-8">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-white">Loading building data</span>
        </div>
      </div>
    );
  if (error) return <div className="p-4 text-red-500">{error}</div>;
  if (!buildingData) return null;

  const handleLocationRequest = () => {
    location.requestLocationPermission();

    // Show toast based on location permissions state
    if (location.permissionStatus === "denied") {
      toast({
        title: "Location access denied",
        description:
          "Please enable location access in your browser settings to see buildings sorted by distance.",
        variant: "destructive",
      });
    } else if (location.error) {
      toast({
        title: "Location error",
        description: location.error,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Getting your location",
        description: "Sorting buildings by proximity...",
      });
    }
  };

  const toggleSortByDistance = () => {
    setSortByDistance(!sortByDistance);
  };

  // Accordion content component - extracted to reuse in tabs
  const BuildingAccordionContent = () => (
    <Accordion
      type="multiple"
      className="w-full h-full overflow-y-auto"
      value={expandedAccordionItems}
      onValueChange={setExpandedAccordionItems}
      ref={accordionContainerRef}
    >
      {getSortedBuildingEntries().map(([buildingName, building]) => {
        // Get total building occupancy
        const buildingOccupancy = getBuildingOccupancy(buildingName);

        return (
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
                  <div className="flex items-end gap-2">
                    {/* Occupancy badge for building */}
                    {buildingOccupancy > 0 && (
                      <OccupancyBadge
                        count={buildingOccupancy}
                        className="bg-[#3a464e]"
                      />
                    )}
                    <div className="flex items-center gap-2">
                      {(() => {
                        const totalRooms = Object.keys(building.rooms).length;
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
                {sortByDistance && location.buildingDistances[buildingName] && (
                  <span className="text-sm text-gray-400 ml-2">
                    {location.buildingDistances[buildingName] < 1
                      ? `${(
                          location.buildingDistances[buildingName] * 1000
                        ).toFixed(0)} m`
                      : `${location.buildingDistances[buildingName].toFixed(
                          1
                        )} km`}
                  </span>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <Accordion type="multiple" className="mx-4">
                {Object.entries(building.rooms).map(([roomName, schedules]) => {
                  const roomAvailable = isRoomAvailable(
                    schedules,
                    currentDateTime
                  );
                  // Get room occupancy count
                  const roomCount = roomOccupancy[roomName] || 0;

                  return (
                    <AccordionItem key={roomName} value={roomName}>
                      <AccordionTrigger
                        className="flex items-center justify-between px-3 py-5 hover:no-underline"
                        usePlusMinusToggle={true}
                        additionalControls={
                          isAuthenticated ? (
                            <div className="flex items-center gap-6">
                              {/* Room occupancy badge */}
                              {roomCount > 0 && (
                                <OccupancyBadge
                                  count={roomCount}
                                  className="bg-[#3a464e]"
                                />
                              )}
                              <FavoriteButton
                                roomName={roomName}
                                isFavorite={favorites.includes(roomName)}
                                onToggle={toggleFavorite}
                              />
                            </div>
                          ) : // Show occupancy badge even for non-authenticated users
                          roomCount > 0 ? (
                            <OccupancyBadge
                              count={roomCount}
                              className="bg-[#3a464e]"
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
                          <div className="w-full flex justify-between items-center">
                            <h1>Schedule</h1>
                            {isAuthenticated && (
                              <ToggleCheckInButton
                                key={`check-in-button-${roomName}-${Date.now()}`}
                                roomId={roomName}
                                roomName={roomName}
                              />
                            )}
                          </div>
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
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );

  return (
    <div className="flex flex-col h-full w-full gap-y-3 md:gap-y-4 max-h-screen overflow-hidden">
      <Navbar
        setSearchQuery={setSearchQuery}
        setDisplaySettings={setDisplaySettings}
        displaySettings={displaySettings}
        currentDateTime={currentDateTime}
        onLocationRequest={handleLocationRequest}
        sortByDistance={sortByDistance}
        toggleSortByDistance={toggleSortByDistance}
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
          userLocation={
            location.latitude && location.longitude
              ? {
                  latitude: location.latitude,
                  longitude: location.longitude,
                }
              : undefined
          }
        />
        <div className="flex flex-col items-center w-full md:w-1/3 h-full overflow-hidden gap-4">
          {isAuthenticated ? (
            <Tabs
              defaultValue="rooms"
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full h-full flex flex-col"
            >
              <TabsList className="w-full mb-2 bg-[#2a3137]">
                <TabsTrigger value="rooms" className="flex-1">
                  Rooms
                </TabsTrigger>
                <TabsTrigger value="feed" className="flex-1">
                  Feed
                </TabsTrigger>
              </TabsList>
              <TabsContent
                value="rooms"
                className="flex-1 h-full overflow-hidden m-0 data-[state=active]:flex data-[state=active]:flex-col rounded-2xl"
              >
                <BuildingAccordionContent />
              </TabsContent>
              <TabsContent
                value="feed"
                className="flex-1 h-full overflow-hidden m-0 rounded-2xl"
              >
                <ActivityFeed />
              </TabsContent>
            </Tabs>
          ) : (
            <BuildingAccordionContent />
          )}
        </div>
      </div>
    </div>
  );
}
