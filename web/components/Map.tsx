"use client";

import React, { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

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
}

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

const Map = ({
  className = "",
  buildingData,
  isRoomAvailable,
  onBuildingClick,
  selectedBuilding,
}: MapProps) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<{ [key: string]: mapboxgl.Marker }>({});

  useEffect(() => {
    if (!mapContainerRef.current) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/jdrco/cm649khvj002601sthc0bc7la",
    });

    return () => {
      Object.values(markersRef.current).forEach((marker) => marker.remove());
      if (mapRef.current) {
        mapRef.current.remove();
      }
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !buildingData) return;

    mapRef.current.on("load", () => {
      Object.entries(buildingData).forEach(([buildingName, building]) => {
        const availableRooms = getAvailableRoomCount(building, isRoomAvailable);
        const totalRooms = Object.keys(building.rooms).length;
        const markerColor = getAvailabilityColor(availableRooms, totalRooms);

        // Create marker element
        const el = document.createElement("div");
        el.className = "building-marker";
        el.style.width = "20px";
        el.style.height = "20px";
        el.style.borderRadius = "50%";
        el.style.boxShadow = `0 0 10px ${markerColor}`;
        el.style.backgroundColor = markerColor;
        el.style.border = "2px solid white";
        el.style.cursor = "pointer";

        // Add pulse animation if selected
        if (selectedBuilding === buildingName) {
          el.style.animation = "pulse 2s infinite";
        }

        // Create or update marker
        if (markersRef.current[buildingName]) {
          markersRef.current[buildingName].remove();
        }

        const marker = new mapboxgl.Marker(el)
          .setLngLat([
            building.coordinates.longitude,
            building.coordinates.latitude,
          ])
          .addTo(mapRef.current!);

        el.addEventListener("click", () => {
          onBuildingClick?.(buildingName);
        });

        markersRef.current[buildingName] = marker;
      });
    });

    // Add pulse animation styles
    if (!document.getElementById("marker-styles")) {
      const style = document.createElement("style");
      style.id = "marker-styles";
      style.textContent = `
        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(74, 166, 157, 0.7);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(74, 166, 157, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(74, 166, 157, 0);
          }
        }
      `;
      document.head.appendChild(style);
    }
  }, [buildingData, isRoomAvailable, selectedBuilding, onBuildingClick]);

  return <div ref={mapContainerRef} className={`h-full w-full ${className}`} />;
};

export default Map;
