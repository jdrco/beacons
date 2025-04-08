"use client";

import { useState, useCallback } from "react";
import { CircleCheckBig, LogOut, Loader2 } from "lucide-react";
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

interface ToggleCheckInButtonProps {
  roomId: string;
  roomName: string;
}

export default function ToggleCheckInButton({
  roomId,
  roomName,
}: ToggleCheckInButtonProps) {
  const [showAlertDialog, setShowAlertDialog] = useState<boolean>(false);
  const [studyTopic, setStudyTopic] = useState<string>("");
  const { isCheckedIn, checkedInRoom, checkIn, checkOut, isLoading } =
    useCheckIn();

  // Memoize this calculation to ensure stable renders
  const isCheckedInThisRoom = useCallback(() => {
    const result = isCheckedIn && checkedInRoom?.id === roomId;
    console.log(`Checked in status for room ${roomId}:`, {
      isCheckedIn,
      checkedInRoomId: checkedInRoom?.id,
      roomId,
      result,
    });
    return result;
  }, [isCheckedIn, checkedInRoom, roomId]);

  const handleButtonClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isCheckedInThisRoom()) {
      // If already checked in to this room, check out directly
      console.log(`Checking out from room ${roomId}`);
      checkOut();
    } else if (!isLoading) {
      // Otherwise show dialog for check-in
      setShowAlertDialog(true);
    }
  };

  const handleCheckIn = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log(`Checking into room ${roomId} with topic: ${studyTopic}`);
    checkIn(roomId, roomName, studyTopic);
    setShowAlertDialog(false);
    setStudyTopic("");
  };

  // Determine current status
  const currentlyCheckedInThisRoom = isCheckedInThisRoom();

  // Determine button appearance based on currentlyCheckedInThisRoom
  const buttonClass = currentlyCheckedInThisRoom
    ? "bg-red-600 hover:bg-red-700 text-white"
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
  ) : (
    <>
      <CircleCheckBig className="h-4 w-4" />
      Check In
    </>
  );

  return (
    <>
      <AlertDialog open={showAlertDialog} onOpenChange={setShowAlertDialog}>
        {/* Only wrap in AlertDialogTrigger if not checked in */}
        {currentlyCheckedInThisRoom ? (
          <button
            className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${buttonClass}`}
            onClick={handleButtonClick}
            disabled={isLoading}
          >
            {buttonContent}
          </button>
        ) : (
          <AlertDialogTrigger asChild>
            <button
              className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${buttonClass}`}
              onClick={handleButtonClick}
              disabled={isLoading}
            >
              {buttonContent}
            </button>
          </AlertDialogTrigger>
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
