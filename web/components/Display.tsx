"use client";

import { Heart, Building2, DoorOpen, DoorClosed } from "lucide-react";
import { useState, useEffect } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import _ from "lodash";

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
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<string | null>(null);

  useEffect(() => {
    const fetchBuildingData = async () => {
      try {
        const response = await fetch("/classroom_availability.json");
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

  const isRoomAvailable = (schedules: Schedule[]): boolean => {
    // TODO: Implement actual availability logic based on current time
    // For now, returning a random boolean for demonstration
    return Math.random() > 0.5;
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
      <Accordion type="multiple" className="space-y-2 w-1/3">
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
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-1 rounded-full text-sm mr-2 ${
                    isRoomAvailable(Object.values(building.rooms).flat())
                      ? "bg-[#4fd1c5] text-black"
                      : "bg-[#f56565] text-white"
                  }`}
                >
                  {isRoomAvailable(Object.values(building.rooms).flat()) ? (
                    <span>free &#x1F440;</span>
                  ) : (
                    <span>busy &#9203;</span>
                  )}
                </span>
                <span className="text-sm text-gray-400">
                  {Object.keys(building.rooms).length} rooms
                </span>
              </div>
            </AccordionTrigger>

            <AccordionContent className="mt-2">
              <Accordion type="multiple" className="ml-8 space-y-2">
                {Object.entries(building.rooms).map(([roomName, schedules]) => {
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
                })}
              </Accordion>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
