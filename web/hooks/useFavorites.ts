import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

// Define the structure of a favorite room from the API
interface FavoriteRoom {
  room_name: string;
  notification_sent: boolean;
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [favoriteDetails, setFavoriteDetails] = useState<FavoriteRoom[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();

  const fetchFavorites = useCallback(async () => {
    if (!isAuthenticated) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/favorites/list");

      if (!response.ok) {
        console.warn("Failed to fetch favorites:", response.statusText);
        return; // just bail out silently
      }

      const data = await response.json();

      // Store the full objects for potential future use
      setFavoriteDetails(data.data || []);

      // Extract just the room names for compatibility with existing code
      const roomNames = (data.data || []).map(
        (room: FavoriteRoom) => room.room_name
      );
      setFavorites(roomNames);
    } catch (error) {
      console.error("Error fetching favorites:", error);
      setError(
        error instanceof Error ? error.message : "Failed to load favorites"
      );
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Load favorites when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchFavorites();
    } else {
      setFavorites([]);
      setFavoriteDetails([]);
    }
  }, [isAuthenticated, fetchFavorites]);

  const toggleFavorite = async (
    roomName: string,
    shouldBeFavorite: boolean
  ) => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to save favorites",
        variant: "destructive",
      });
      return false;
    }

    try {
      const endpoint = shouldBeFavorite ? "add" : "remove";
      const response = await fetch(`/api/favorites/${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ roomName }),
      });

      if (!response.ok) {
        throw new Error(
          `Failed to ${shouldBeFavorite ? "add" : "remove"} favorite`
        );
      }

      // Update local state without fetching again
      if (shouldBeFavorite) {
        setFavorites((prev) => [...prev, roomName]);
        setFavoriteDetails((prev) => [
          ...prev,
          { room_name: roomName, notification_sent: true },
        ]);
      } else {
        setFavorites((prev) => prev.filter((name) => name !== roomName));
        setFavoriteDetails((prev) =>
          prev.filter((room) => room.room_name !== roomName)
        );
      }

      toast({
        title: "Success",
        description: shouldBeFavorite
          ? "Room added to favorites"
          : "Room removed from favorites",
      });

      return true;
    } catch (error) {
      console.error(
        `Error ${shouldBeFavorite ? "adding" : "removing"} favorite:`,
        error
      );
      toast({
        title: "Error",
        description: `Failed to ${
          shouldBeFavorite ? "add" : "remove"
        } favorite`,
        variant: "destructive",
      });
      return false;
    }
  };

  const isFavorite = (roomName: string) => {
    return favorites.includes(roomName);
  };

  const getNotificationStatus = (roomName: string) => {
    const room = favoriteDetails.find((r) => r.room_name === roomName);
    return room?.notification_sent || false;
  };

  const toggleNotification = async (roomName: string) => {
    if (!isAuthenticated) return false;

    try {
      const response = await fetch(`/api/favorites/toggle-notification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ roomName }),
      });

      if (!response.ok) {
        throw new Error("Failed to toggle notification");
      }

      const data = await response.json();

      // Update local state
      setFavoriteDetails((prev) =>
        prev.map((room) =>
          room.room_name === roomName
            ? { ...room, notification_sent: data.data.notification_sent }
            : room
        )
      );

      return true;
    } catch (error) {
      console.error("Error toggling notification:", error);
      toast({
        title: "Error",
        description: "Failed to toggle notifications",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    favorites,
    favoriteDetails,
    isLoading,
    error,
    fetchFavorites,
    toggleFavorite,
    isFavorite,
    getNotificationStatus,
    toggleNotification,
  };
}
