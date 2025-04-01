"use client";

import { Heart } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/useToast";
import { useAuth } from "@/contexts/AuthContext";

interface FavoriteButtonProps {
  roomName: string;
  isFavorite: boolean;
  onToggle: (roomName: string, isFavorite: boolean) => Promise<boolean>;
}

export default function FavoriteButton({
  roomName,
  isFavorite: initialIsFavorite,
  onToggle,
}: FavoriteButtonProps) {
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    setIsFavorite(initialIsFavorite);
  }, [initialIsFavorite]);

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to save favorites",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const newState = !isFavorite;
      const success = await onToggle(roomName, newState);

      if (success) {
        setIsFavorite(newState);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      onClick={toggleFavorite}
      role="button"
      tabIndex={0}
      className={`transition-all duration-200 hover:scale-110 ${
        isLoading ? "opacity-50" : ""
      }`}
      aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          toggleFavorite(e as any);
        }
      }}
    >
      <Heart
        className={`h-6 w-6 ${
          isFavorite
            ? "fill-red-500 stroke-red-500"
            : "stroke-white hover:stroke-red-400"
        }`}
      />
    </div>
  );
}
