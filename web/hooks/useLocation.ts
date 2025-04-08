import { useState, useEffect } from "react";

interface LocationState {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
  loading: boolean;
  permissionStatus: PermissionState | null;
}

interface DistanceResult {
  name: string;
  distance_km: number;
}

interface DistanceResults {
  distances: DistanceResult[];
  error?: string;
}

export const useLocation = () => {
  const [location, setLocation] = useState<LocationState>({
    latitude: null,
    longitude: null,
    error: null,
    loading: true,
    permissionStatus: null,
  });

  const [buildingDistances, setBuildingDistances] = useState<{
    [key: string]: number;
  }>({});

  useEffect(() => {
    // Request location permission when the hook mounts
    requestLocationPermission();
  }, []); // Empty dependency array means this runs once on component mount

  // Test location
  // const requestLocationPermission = async () => {
  //   setLocation((prev) => ({
  //     ...prev,
  //     latitude: 53.5264113,
  //     longitude: -113.52983,
  //     error: null,
  //     loading: false,
  //     permissionStatus: "granted",
  //   }));
  // };
  const requestLocationPermission = async () => {
    setLocation((prev) => ({ ...prev, loading: true, error: null }));

    try {
      // Attempt to get current position directly, which will trigger the permission dialog if needed
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            error: null,
            loading: false,
            permissionStatus: "granted",
          });
        },
        (error) => {
          let errorMessage = "Unable to retrieve your location";

          // Specific error messages based on the error code
          if (error.code === 1) {
            errorMessage = "Location permission denied";
          } else if (error.code === 2) {
            errorMessage = "Location unavailable";
          } else if (error.code === 3) {
            errorMessage = "Location request timed out";
          }

          setLocation({
            latitude: null,
            longitude: null,
            error: errorMessage,
            loading: false,
            permissionStatus: "denied",
          });
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        }
      );
    } catch (error) {
      setLocation({
        latitude: null,
        longitude: null,
        error: error instanceof Error ? error.message : "Unknown error",
        loading: false,
        permissionStatus: "denied",
      });
    }
  };


  // Calculate distances using the backend API
  const calculateDistances = async (buildingData: any) => {
    if (!location.latitude || !location.longitude || !buildingData) {
      return;
    }

    try {
      // Prepare data for API call
      const destinations = Object.entries(buildingData).map(
        ([name, building]: [string, any]) => [
          name,
          building.coordinates.latitude,
          building.coordinates.longitude,
        ]
      );

      // Make API call to calculate distances through the Next.js API route
      const response = await fetch("/api/calculate_distances", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          start_lat: location.latitude,
          start_long: location.longitude,
          destinations: destinations,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to calculate distances");
      }

      const data: DistanceResults = await response.json();

      // Process the response
      const distances: { [key: string]: number } = {};

      if (data.distances) {
        data.distances.forEach((item: DistanceResult) => {
          distances[item.name] = item.distance_km;
        });

        setBuildingDistances(distances);
      }
    } catch (error) {
      console.error("Error calculating distances:", error);
    }
  };

  return {
    ...location,
    buildingDistances,
    requestLocationPermission,
    calculateDistances,
  };
};
