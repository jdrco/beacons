"use client";

import React, { useState, useCallback, memo } from "react";
import { CircleCheckBig, LogOut, Loader2, Users } from "lucide-react";
import { useCheckIn } from "@/hooks/useCheckIn";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  AlertDialogDescription,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ToggleCheckInButtonProps {
  roomId: string;
  roomName: string;
  maxOccupancy?: number;
}

// Create a non-memoized internal component
function ToggleCheckInButtonInternal({
  roomId,
  roomName,
  maxOccupancy = 40, // Default maximum occupancy
}: ToggleCheckInButtonProps) {
  const [showAlertDialog, setShowAlertDialog] = useState<boolean>(false);
  const [studyTopic, setStudyTopic] = useState<string>("");
  const {
    isCheckedIn,
    checkedInRoom,
    checkIn,
    checkOut,
    isLoading,
    roomOccupancy,
  } = useCheckIn();
  const { toast } = useToast();

  // Check if user is checked into this specific room
  const isCheckedInThisRoom = isCheckedIn && checkedInRoom?.id === roomId;

  // Check if the room is at or over max capacity
  const currentOccupancy = roomOccupancy[roomName] || 0;
  const isRoomFull = currentOccupancy >= maxOccupancy;
  const roomIsFull = isRoomFull && !isCheckedInThisRoom;

  const handleButtonClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (isCheckedInThisRoom) {
        // If already checked in to this room, check out directly
        checkOut();
      } else if (!isLoading) {
        // Check if room is full before showing dialog
        if (isRoomFull) {
          toast({
            title: "Room is at capacity",
            description: `${roomName} currently has ${currentOccupancy} people and has reached its maximum capacity of ${maxOccupancy}.`,
            variant: "destructive",
          });
          return;
        }

        // Otherwise show dialog for check-in
        setShowAlertDialog(true);
      }
    },
    [
      isCheckedInThisRoom,
      isLoading,
      isRoomFull,
      checkOut,
      roomName,
      currentOccupancy,
      maxOccupancy,
      toast,
    ]
  );

  const handleCheckIn = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Double-check that room isn't full
      if (isRoomFull) {
        toast({
          title: "Room is at capacity",
          description: `${roomName} currently has ${currentOccupancy} people and has reached its maximum capacity of ${maxOccupancy}.`,
          variant: "destructive",
        });
        setShowAlertDialog(false);
        return;
      }

      checkIn(roomId, roomName, studyTopic);
      setShowAlertDialog(false);
      setStudyTopic("");
    },
    [
      isRoomFull,
      roomName,
      currentOccupancy,
      maxOccupancy,
      toast,
      checkIn,
      roomId,
      studyTopic,
    ]
  );

  // Determine button appearance
  const buttonClass = isCheckedInThisRoom
    ? "bg-red-600 hover:bg-red-700 text-white"
    : roomIsFull
    ? "bg-gray-400 text-gray-600 cursor-not-allowed opacity-70"
    : "bg-white hover:bg-green-700 text-[#191f23]";

  // Create button content
  const buttonContent = isLoading ? (
    <Loader2 className="h-4 w-4 animate-spin" />
  ) : isCheckedInThisRoom ? (
    <>
      <LogOut className="h-4 w-4" />
      Check Out
    </>
  ) : roomIsFull ? (
    <>
      <Users className="h-4 w-4" />
      At Capacity
    </>
  ) : (
    <>
      <CircleCheckBig className="h-4 w-4" />
      Check In
    </>
  );

  // Create the button element
  const renderButton = () => {
    const button = (
      <button
        className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${buttonClass}`}
        onClick={handleButtonClick}
        disabled={isLoading || roomIsFull}
        type="button"
      >
        {buttonContent}
      </button>
    );

    // If room is full, wrap in tooltip
    if (roomIsFull) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>{button}</TooltipTrigger>
            <TooltipContent>
              <p>This room has reached maximum occupancy of {maxOccupancy}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return button;
  };

  // Add event handlers to prevent event bubbling
  const handleDialogClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div onClick={handleDialogClick}>
      <AlertDialog open={showAlertDialog} onOpenChange={setShowAlertDialog}>
        {/* If checked in or room is full, don't wrap in trigger */}
        {isCheckedInThisRoom || roomIsFull ? (
          renderButton()
        ) : (
          <AlertDialogTrigger asChild>{renderButton()}</AlertDialogTrigger>
        )}

        <AlertDialogContent
          className="sm:max-w-[425px]"
          onClick={handleDialogClick}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Check In to {roomName}</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription>
            Show others where you are studying at
          </AlertDialogDescription>
          <div className="grid gap-4 py-4" onClick={handleDialogClick}>
            <div className="grid gap-2">
              <Label htmlFor="study-topic">
                What are you studying? (optional)
              </Label>
              <Input
                id="study-topic"
                placeholder="e.g., CMPUT 174, Biology, Math..."
                value={studyTopic}
                onChange={(e) => setStudyTopic(e.target.value)}
                onClick={handleDialogClick}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2" onClick={handleDialogClick}>
            <div
              className="flex items-center justify-center px-4 py-2 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground cursor-pointer text-sm font-medium"
              onClick={(e) => {
                e.stopPropagation();
                setShowAlertDialog(false);
              }}
            >
              Cancel
            </div>
            <div
              className="flex items-center justify-center px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer text-sm font-medium"
              onClick={handleCheckIn}
            >
              Check In
            </div>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Export a memoized version to prevent unnecessary re-renders
const ToggleCheckInButton = memo(ToggleCheckInButtonInternal);
export default ToggleCheckInButton;
