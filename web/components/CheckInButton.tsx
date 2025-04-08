"use client";

import { useState } from "react";
import { CircleCheckBig, LogOut } from "lucide-react";
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

interface CheckInButtonProps {
  roomId: string;
  roomName: string;
}

export default function CheckInButton({
  roomId,
  roomName,
}: CheckInButtonProps) {
  const [showAlertDialog, setShowAlertDialog] = useState<boolean>(false);
  const [studyTopic, setStudyTopic] = useState<string>("");
  const { isCheckedIn, checkedInRoom, checkIn, checkOut, isLoading } =
    useCheckIn();

  const isCheckedInThisRoom = isCheckedIn && checkedInRoom?.id === roomId;

  // Handle button click without triggering accordion
  const handleButtonClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoading) {
      setShowAlertDialog(true);
    }
  };

  const handleCheckIn = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    checkIn(roomId, roomName, studyTopic);
    setShowAlertDialog(false);
    setStudyTopic("");
  };

  const handleCheckOut = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    checkOut();
  };

  // If checked in to another room, show disabled icon
  // if (isCheckedIn && !isCheckedInThisRoom) {
  //   return (
  //     <div
  //       className="h-8 w-8 flex items-center justify-center opacity-50 cursor-not-allowed"
  //       title={`You are already checked in to ${checkedInRoom?.name}`}
  //       onClick={(e) => e.stopPropagation()}
  //     >
  //       <CheckCircle className="h-6 w-6" />
  //     </div>
  //   );
  // }

  // If checked in to this room, show check out button
  if (isCheckedInThisRoom) {
    return (
      <div
        className="h-8 w-8 flex items-center justify-center text-red-700 hover:text-red-800 cursor-pointer"
        onClick={handleCheckOut}
        title="Check out"
      >
        <LogOut className="h-6 w-6" />
      </div>
    );
  }

  // Otherwise, show check in icon and dialog
  return (
    <AlertDialog open={showAlertDialog} onOpenChange={setShowAlertDialog}>
      <AlertDialogTrigger asChild>
        <div
          className="h-8 w-8 flex items-center justify-center text-green-700 hover:text-green-800 cursor-pointer"
          onClick={handleButtonClick}
          title="Check in"
        >
          <CircleCheckBig className="h-6 w-6" />
        </div>
      </AlertDialogTrigger>
      <AlertDialogContent
        className="sm:max-w-[425px]"
        onClick={(e) => e.stopPropagation()}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>Check In to {roomName}</AlertDialogTitle>
        </AlertDialogHeader>
        <AlertDialogDescription>Show others where you are studying at</AlertDialogDescription>
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
          {/* Convert Button to styled div - Cancel button */}
          <div
            className="flex items-center justify-center px-4 py-2 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground cursor-pointer text-sm font-medium"
            onClick={(e) => {
              e.stopPropagation();
              setShowAlertDialog(false);
            }}
          >
            Cancel
          </div>

          {/* Convert Button to styled div - Check In button */}
          <div
            className="flex items-center justify-center px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer text-sm font-medium"
            onClick={handleCheckIn}
          >
            Check In
          </div>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
