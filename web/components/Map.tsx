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
  isBuildingAvailable?: (building: Building) => boolean;
  onBuildingClick?: (buildingName: string) => void;
  selectedBuilding?: string | null;
}

const Map = ({
  className = "",
  buildingData,
  isBuildingAvailable,
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
      // Clean up markers
      Object.values(markersRef.current).forEach((marker) => marker.remove());
      if (mapRef.current) {
        mapRef.current.remove();
      }
    };
  }, []);

  // Add or update markers when building data changes
  useEffect(() => {
    if (!mapRef.current || !buildingData || !isBuildingAvailable) return;

    // Wait for map to load before adding markers
    mapRef.current.on("load", () => {
      Object.entries(buildingData).forEach(([buildingName, building]) => {
        const isAvailable = isBuildingAvailable(building);

        // Create marker element
        const el = document.createElement("div");
        el.className = "building-marker";
        el.style.width = "20px";
        el.style.height = "20px";
        el.style.borderRadius = "50%";
        el.style.boxShadow = `0 0 10px ${isAvailable ? "#4fd1c5" : "#f56565"}`;
        el.style.backgroundColor = isAvailable ? "#4fd1c5" : "#f56565";
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

        // Add click handler
        el.addEventListener("click", () => {
          onBuildingClick?.(buildingName);
        });

        markersRef.current[buildingName] = marker;
      });
    });

    // Add necessary CSS for pulse animation
    if (!document.getElementById("marker-styles")) {
      const style = document.createElement("style");
      style.id = "marker-styles";
      style.textContent = `
        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(79, 209, 197, 0.7);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(79, 209, 197, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(79, 209, 197, 0);
          }
        }
      `;
      document.head.appendChild(style);
    }
  }, [buildingData, isBuildingAvailable, selectedBuilding, onBuildingClick]);

  return <div ref={mapContainerRef} className={`h-full w-full ${className}`} />;
};

export default Map;
