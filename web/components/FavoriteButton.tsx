"use client";

import { Heart } from "lucide-react";
import { useState } from "react";

export default function FavoriteButton() {
  const [isFavorite, setIsFavorite] = useState(false);

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsFavorite((prev) => !prev);
      }}
      className="transition-all duration-200 hover:scale-110"
      aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
    >
      <Heart
        className={`h-6 w-6 ${
          isFavorite
            ? "fill-red-500 stroke-red-500"
            : "stroke-white hover:stroke-red-400"
        }`}
      />
    </button>
  );
}
