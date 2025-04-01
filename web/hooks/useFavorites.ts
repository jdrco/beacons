import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/useToast";

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);
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
        throw new Error("Failed to fetch favorites");
      }

      const data = await response.json();
      setFavorites(data.data || []);
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
      } else {
        setFavorites((prev) => prev.filter((name) => name !== roomName));
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

  return {
    favorites,
    isLoading,
    error,
    fetchFavorites,
    toggleFavorite,
    isFavorite,
  };
}
