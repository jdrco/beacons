"use client";

import { User } from "lucide-react";
import { cn } from "@/lib/utils";

type OccupancyBadgeProps = {
  count: number;
  className?: string;
  showZero?: boolean;
};

const OccupancyBadge = ({
  count,
  className,
  showZero = false,
}: OccupancyBadgeProps) => {
  if (count === 0 && !showZero) {
    return null;
  }

  return (
    <span
      className={cn(
        "flex justify-center items-center gap-1 py-1 px-2 rounded-full text-sm text-white bg-[#2a3137]",
        className
      )}
    >
      <User className="h-3.5 w-3.5" strokeWidth={2} />
      <span className="leading-4">{count}</span>
    </span>
  );
};

export default OccupancyBadge;
