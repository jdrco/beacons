import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getAvailabilityColor = (
  availableRooms: number,
  totalRooms: number
): string => {
  const ratio = availableRooms / totalRooms;
  if (ratio >= 0.5) return "#4AA69D"; // green
  if (ratio >= 0.25) return "#DDAA5E"; // yellow
  return "#F66A6A"; // red
};
