import { useState, useEffect } from "react";
import { BuildingData } from "@/types";

export function useBuildingData() {
  const [buildingData, setBuildingData] = useState<BuildingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return { buildingData, loading, error };
}
