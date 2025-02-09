import React, { useState, useEffect } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card } from "@/components/ui/card";
import { Building2, Clock } from "lucide-react";
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

const ClassroomDisplay: React.FC = () => {
  const [buildingData, setBuildingData] = useState<BuildingData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
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
        const errorMessage =
          err instanceof Error ? err.message : "Failed to load building data";
        setError(errorMessage);
        console.error("Error loading building data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchBuildingData();
  }, []);

  const isRoomAvailable = (schedules: Schedule[]): boolean => {
    // TODO: Implement actual availability logic based on current time
    return true;
  };

  const getRoomCount = (building: Building): number => {
    return Object.keys(building.rooms).length;
  };

  const handleBuildingSelect = (buildingName: string) => {
    setSelectedBuilding(
      selectedBuilding === buildingName ? null : buildingName
    );
  };

  if (loading) return <div className="p-4">Loading building data...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;
  if (!buildingData) return null;

  return (
    <div className="flex gap-4 p-4">
      {/* Map placeholder */}
      <Card className="w-1/2 p-4">
        <div className="h-96 bg-gray-100 flex items-center justify-center">
          Map Coming Soon
          {selectedBuilding && buildingData[selectedBuilding] && (
            <div>
              Selected: {selectedBuilding} (
              {buildingData[selectedBuilding].coordinates.latitude.toFixed(6)},
              {buildingData[selectedBuilding].coordinates.longitude.toFixed(6)})
            </div>
          )}
        </div>
      </Card>

      {/* List view */}
      <Card className="w-1/2 p-4">
        <Accordion type="single" collapsible className="w-full">
          {Object.entries(buildingData).map(([buildingName, building]) => (
            <AccordionItem key={buildingName} value={buildingName}>
              <AccordionTrigger
                className="hover:no-underline"
                onClick={() => handleBuildingSelect(buildingName)}
              >
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  <span>{buildingName}</span>
                  <span className="text-sm text-gray-500">
                    ({getRoomCount(building)} rooms)
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  {Object.entries(building.rooms).map(
                    ([roomName, schedules]) => (
                      <div
                        key={roomName}
                        className={`p-2 rounded-md ${
                          isRoomAvailable(schedules)
                            ? "bg-green-50 border border-green-200"
                            : "bg-red-50 border border-red-200"
                        }`}
                      >
                        <div className="font-medium">{roomName}</div>
                        <div className="text-sm text-gray-600">
                          {schedules.map((schedule, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-1 mt-1"
                            >
                              <Clock className="h-3 w-3" />
                              <span>
                                {schedule.course}: {schedule.time} (
                                {schedule.dates})
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Card>
    </div>
  );
};

export default ClassroomDisplay;
