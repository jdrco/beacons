"use client";
import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom/client";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { DoorOpen, Loader2 } from "lucide-react";
import {
  getAvailabilityColor,
  getAvailabilityColorBrighter,
} from "@/lib/utils";

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

interface MapProps {
  className?: string;
  buildingData?: BuildingData;
  isRoomAvailable: (schedules: Schedule[]) => boolean;
  onBuildingClick?: (buildingName: string) => void;
  selectedBuilding?: string | null;
  currentDateTime: Date;
  showTooltip?: boolean;
}

const getAvailableRoomCount = (
  building: Building,
  isRoomAvailable: (schedules: Schedule[]) => boolean
): number => {
  return Object.values(building.rooms).reduce((count, schedules) => {
    return count + (isRoomAvailable(schedules) ? 1 : 0);
  }, 0);
};

const MapLegend = () => {
  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[#1e2329b3] border border-gray-700 rounded-lg p-2 shadow-lg z-10 min-w-fit whitespace-nowrap">
      <div className="hidden md:block mb-1.5 text-xs font-medium text-white/90 text-center">
        Classroom Availability
      </div>
      <div className="flex justify-center gap-3">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#50C9BD] shadow-sm shadow-[#50C9BD]/50"></div>
          <span className="text-xs text-white">≥50%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#FFBB45] shadow-sm shadow-[#FFBB45]/50"></div>
          <span className="text-xs text-white">25-50%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#FF5252] shadow-sm shadow-[#FF5252]/50"></div>
          <span className="text-xs text-white">&lt;25%</span>
        </div>
      </div>
    </div>
  );
};

// Define interface for tooltip props
interface BuildingTooltipProps {
  buildingName: string;
  availableRooms: number;
  totalRooms: number;
}

// Custom tooltip component for the popups
const BuildingTooltip = ({
  buildingName,
  availableRooms,
  totalRooms,
}: BuildingTooltipProps) => {
  const backgroundColor = getAvailabilityColor(availableRooms, totalRooms);

  return (
    <div className="bg-[#1e2329b3] border border-gray-700 rounded-lg p-3 shadow-lg min-w-[150px]">
      <div className="flex items-center justify-between">
        <div className="text-white font-medium">{buildingName}</div>
        <span
          className="flex justify-center items-center gap-1 py-1 px-2 rounded-full text-xs text-white"
          style={{ backgroundColor }}
        >
          <DoorOpen className="h-3 w-3" strokeWidth={2} />
          <span>
            {availableRooms}/{totalRooms}
          </span>
        </span>
      </div>
    </div>
  );
};

const Map = ({
  className = "",
  buildingData,
  isRoomAvailable,
  onBuildingClick,
  selectedBuilding,
  currentDateTime,
  showTooltip = true,
}: MapProps) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<{ [key: string]: mapboxgl.Marker }>({});
  const popupsRef = useRef<{ [key: string]: mapboxgl.Popup }>({});
  const activePopupRef = useRef<string | null>(null);
  const isMobileRef = useRef<boolean>(false);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      isMobileRef.current = window.innerWidth < 768;
    };

    // Check initially
    checkMobile();

    // Add resize listener
    window.addEventListener("resize", checkMobile);

    // Cleanup
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Initialize map on component mount
  useEffect(() => {
    if (!mapContainerRef.current) return;
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/jdrco/cm649khvj002601sthc0bc7la",
    });

    mapRef.current = map;

    // Set loaded state when map is fully loaded
    map.on("load", () => {
      setIsMapLoaded(true);
    });

    // Cleanup function
    return () => {
      Object.values(markersRef.current).forEach((marker) => marker.remove());
      Object.values(popupsRef.current).forEach((popup) => popup.remove());
      if (mapRef.current) {
        mapRef.current.remove();
        activePopupRef.current = null;
      }
    };
  }, []);

  // Update markers when buildingData or filters change
  useEffect(() => {
    if (!mapRef.current || !buildingData) return;

    const updateMarkers = () => {
      // Get current building names from filtered data
      const currentBuildingNames = new Set(Object.keys(buildingData));

      // Remove markers that no longer exist in the filtered data
      Object.keys(markersRef.current).forEach((buildingName) => {
        if (!currentBuildingNames.has(buildingName)) {
          // Remove the marker if it's no longer in the filtered data
          markersRef.current[buildingName].remove();
          delete markersRef.current[buildingName];

          // Also remove any associated popup
          if (popupsRef.current[buildingName]) {
            popupsRef.current[buildingName].remove();
            delete popupsRef.current[buildingName];
          }
        }
      });

      // Create or update markers for filtered buildings
      Object.entries(buildingData).forEach(([buildingName, building]) => {
        const availableRooms = getAvailableRoomCount(building, isRoomAvailable);
        const totalRooms = Object.keys(building.rooms).length;
        const markerColor = getAvailabilityColorBrighter(
          availableRooms,
          totalRooms
        );

        const marker = markersRef.current[buildingName];

        if (marker) {
          // Update existing marker
          const el = marker.getElement();
          el.style.backgroundColor = markerColor;
          el.style.boxShadow = `0 0 8px ${markerColor}`;
        } else {
          // Create new marker
          const el = document.createElement("div");
          el.className = "building-marker";
          el.style.width = "12px";
          el.style.height = "12px";
          el.style.borderRadius = "50%";
          el.style.boxShadow = `0 0 6px ${markerColor}`;
          el.style.backgroundColor = markerColor;
          el.style.cursor = "pointer";

          // Create marker
          const newMarker = new mapboxgl.Marker(el)
            .setLngLat([
              building.coordinates.longitude,
              building.coordinates.latitude,
            ])
            .addTo(mapRef.current!);

          // Create tooltip content
          const tooltipNode = document.createElement("div");
          ReactDOM.createRoot(tooltipNode).render(
            <BuildingTooltip
              buildingName={buildingName}
              availableRooms={availableRooms}
              totalRooms={totalRooms}
            />
          );

          // Create popup but don't add to map yet
          const popup = new mapboxgl.Popup({
            closeButton: false,
            closeOnClick: false,
            offset: 15,
            className: "map-tooltip", // For custom styling if needed
          }).setDOMContent(tooltipNode);

          popupsRef.current[buildingName] = popup;

          // Add click handler to marker
          el.addEventListener("click", () => {
            // If this marker isn't the active one, show its popup
            if (activePopupRef.current !== buildingName) {
              // Hide any previously active popup
              if (
                activePopupRef.current &&
                popupsRef.current[activePopupRef.current]
              ) {
                popupsRef.current[activePopupRef.current].remove();
              }

              // Show this marker's popup
              popup
                .setLngLat([
                  building.coordinates.longitude,
                  building.coordinates.latitude,
                ])
                .addTo(mapRef.current!);

              // Set this as the active popup
              activePopupRef.current = buildingName;
            } else {
              // If this is already the active marker, toggle the popup
              popup.remove();
              activePopupRef.current = null;
            }

            if (onBuildingClick) {
              onBuildingClick(buildingName);
            }
          });

          // Add touch handler specifically for mobile
          el.addEventListener("touchstart", () => {
            if (isMobileRef.current) {
              // For mobile, show popup on touch and keep it visible
              if (activePopupRef.current !== buildingName) {
                // Hide any previously active popup
                if (
                  activePopupRef.current &&
                  popupsRef.current[activePopupRef.current]
                ) {
                  popupsRef.current[activePopupRef.current].remove();
                }

                popup
                  .setLngLat([
                    building.coordinates.longitude,
                    building.coordinates.latitude,
                  ])
                  .addTo(mapRef.current!);

                activePopupRef.current = buildingName;
              } else {
                // If this is already the active marker, toggle the popup
                popup.remove();
                activePopupRef.current = null;
              }

              // Also trigger the building selection
              if (onBuildingClick) {
                onBuildingClick(buildingName);
              }
            }
          });

          // Add hover handlers for desktop only
          el.addEventListener("mouseenter", () => {
            // Only show hover popup on desktop if it's not already the active popup
            if (
              !isMobileRef.current &&
              activePopupRef.current !== buildingName
            ) {
              popup
                .setLngLat([
                  building.coordinates.longitude,
                  building.coordinates.latitude,
                ])
                .addTo(mapRef.current!);
            }
          });

          el.addEventListener("mouseleave", () => {
            // Only hide popup on desktop if it's not the active popup
            if (
              !isMobileRef.current &&
              activePopupRef.current !== buildingName
            ) {
              popup.remove();
            }
          });

          markersRef.current[buildingName] = newMarker;
        }
      });
    };

    // If map is already loaded, update markers immediately
    if (mapRef.current.loaded()) {
      updateMarkers();
    } else {
      // Otherwise wait for the map to load
      mapRef.current.on("load", updateMarkers);
    }
  }, [
    buildingData,
    isRoomAvailable,
    selectedBuilding,
    onBuildingClick,
    currentDateTime,
  ]);

  // Center map on selected building when it changes
  useEffect(() => {
    if (!mapRef.current || !buildingData || !selectedBuilding) return;

    const building = buildingData[selectedBuilding];
    if (building) {
      // Center map on the selected building with animation
      mapRef.current.flyTo({
        center: [building.coordinates.longitude, building.coordinates.latitude],
        zoom: 16,
        duration: 1000,
      });

      // Only show the popup if showTooltip is true
      if (showTooltip && popupsRef.current[selectedBuilding]) {
        // Hide any previously active popup that's not the selected building
        if (
          activePopupRef.current &&
          activePopupRef.current !== selectedBuilding &&
          popupsRef.current[activePopupRef.current]
        ) {
          popupsRef.current[activePopupRef.current].remove();
        }

        // Show the popup for the selected building
        popupsRef.current[selectedBuilding]
          .setLngLat([
            building.coordinates.longitude,
            building.coordinates.latitude,
          ])
          .addTo(mapRef.current!);

        // Update the active popup reference
        activePopupRef.current = selectedBuilding;
      } else if (!showTooltip && activePopupRef.current) {
        // If showTooltip is false, hide any active popup
        if (popupsRef.current[activePopupRef.current]) {
          popupsRef.current[activePopupRef.current].remove();
        }
        activePopupRef.current = null;
      }
    }
  }, [selectedBuilding, buildingData, showTooltip]);

  return (
    <div className={`relative h-full w-full ${className}`}>
      {!isMapLoaded && (
        <div className="absolute inset-0 bg-[#1e2329] rounded-xl md:rounded-2xl z-10 flex flex-col gap-4">
          <div
            className="w-full h-full rounded-lg overflow-hidden"
            style={{
              background:
                "linear-gradient(to bottom, #4AA69D, #DDAA5E, #F66A6A)",
            }}
          >
            <div className="h-full flex items-center justify-center gap-2 text-primary">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Loading map. Hang tight...</span>
            </div>
          </div>
        </div>
      )}

      <div
        ref={mapContainerRef}
        className="h-full w-full rounded-xl md:rounded-2xl overflow-hidden"
      >
        {isMapLoaded && <MapLegend />}
      </div>

      {/* Add some global styles for the tooltips */}
      <style jsx global>{`
        .map-tooltip .mapboxgl-popup-content {
          padding: 0;
          background: transparent;
          box-shadow: none;
          border-radius: 8px;
          overflow: hidden;
        }
        .map-tooltip .mapboxgl-popup-tip {
          display: none;
        }
        .building-marker {
          min-width: 12px;
          min-height: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .building-marker::after {
          content: "";
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: inherit;
          box-shadow: inherit;
        }
      `}</style>
    </div>
  );
};

export default Map;
