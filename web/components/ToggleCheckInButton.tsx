"use client";

import { useState, useCallback } from "react";
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

export default function ToggleCheckInButton({
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

  // Memoize this calculation to ensure stable renders
  const isCheckedInThisRoom = useCallback(() => {
    const result = isCheckedIn && checkedInRoom?.id === roomId;
    return result;
  }, [isCheckedIn, checkedInRoom, roomId]);

  // Check if the room is at or over max capacity
  const isRoomFull = useCallback(() => {
    const currentOccupancy = roomOccupancy[roomName] || 0;
    return currentOccupancy >= maxOccupancy;
  }, [roomOccupancy, roomName, maxOccupancy]);

  const handleButtonClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isCheckedInThisRoom()) {
      // If already checked in to this room, check out directly
      console.log(`Checking out from room ${roomId}`);
      checkOut();
    } else if (!isLoading) {
      // Check if room is full before showing dialog - should never happen with disabled button
      if (isRoomFull()) {
        toast({
          title: "Room is at capacity",
          description: `${roomName} currently has ${
            roomOccupancy[roomName] || 0
          } people and has reached its maximum capacity of ${maxOccupancy}.`,
          variant: "destructive",
        });
        return;
      }

      // Otherwise show dialog for check-in
      setShowAlertDialog(true);
    }
  };

  const handleCheckIn = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Double-check that room isn't full (in case occupancy changed while dialog was open)
    if (isRoomFull()) {
      toast({
        title: "Room is at capacity",
        description: `${roomName} currently has ${
          roomOccupancy[roomName] || 0
        } people and has reached its maximum capacity of ${maxOccupancy}.`,
        variant: "destructive",
      });
      setShowAlertDialog(false);
      return;
    }

    console.log(`Checking into room ${roomId} with topic: ${studyTopic}`);
    checkIn(roomId, roomName, studyTopic);
    setShowAlertDialog(false);
    setStudyTopic("");
  };

  // Determine current status
  const currentlyCheckedInThisRoom = isCheckedInThisRoom();
  const roomIsFull = isRoomFull() && !currentlyCheckedInThisRoom;

  // Determine button appearance
  const buttonClass = currentlyCheckedInThisRoom
    ? "bg-red-600 hover:bg-red-700 text-white"
    : roomIsFull
    ? "bg-gray-400 text-gray-600 cursor-not-allowed opacity-70"
    : "bg-green-600 hover:bg-green-700 text-white";

  const buttonContent = isLoading ? (
    <>
      <Loader2 className="h-4 w-4 animate-spin" />
      {currentlyCheckedInThisRoom ? "Checking Out..." : "Checking In..."}
    </>
  ) : currentlyCheckedInThisRoom ? (
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

  return (
    <>
      <AlertDialog open={showAlertDialog} onOpenChange={setShowAlertDialog}>
        {/* If checked in or room is full, don't wrap in trigger */}
        {currentlyCheckedInThisRoom || roomIsFull ? (
          renderButton()
        ) : (
          <AlertDialogTrigger asChild>{renderButton()}</AlertDialogTrigger>
        )}

        <AlertDialogContent
          className="sm:max-w-[425px]"
          onClick={(e) => e.stopPropagation()}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Check In to {roomName}</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription>
            Show others where you are studying at
          </AlertDialogDescription>
          <div className="grid gap-4 py-4" onClick={(e) => e.stopPropagation()}>
            <div className="grid gap-2">
              <Label htmlFor="study-topic">
                What are you studying? (optional)
              </Label>
              <Input
                id="study-topic"
                placeholder="e.g., CMPUT 174, Biology, Math..."
                value={studyTopic}
                onChange={(e) => setStudyTopic(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
          <div
            className="flex justify-end gap-2"
            onClick={(e) => e.stopPropagation()}
          >
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
    </>
  );
}
