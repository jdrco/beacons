"use client";

import { useCheckIn } from "@/hooks/useCheckIn";
import {
  CheckSquare,
  LogOut,
  Clock,
  Users,
  BookOpen,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useState, useEffect } from "react";

/*
  4.8 Activity Feed

  REQ-1: The system shall maintain a real-time social activity feed for each room showing event information:

    A track of total current occupancy of the classroom
    Recent user check-ins (e.g. "@username started studying at ETLC 1-001")
    If available, the study topics of occupants (e.g. "@username started studying CMPUT 174 at ETLC 1-001")
    Recent user check-outs
    The timestamp of each event

  REQ-2: The system will have a check-in mechanism to maintain accurate real-time occupancy counts.

  REQ-3: The system shall allow users to specify their current study topic or course during check-in optionally.

  REQ-4: The system prevents duplicate check-ins across multiple rooms.

  REQ-5: The system automatically expires check-ins after 4 hours of inactivity.

  REQ-6: The system allows manual check-out before the 4-hour expiration.

  REQ-7: The system shall limit the social media feed history to last 24 hours

  REQ-8: The system’s social media feed shall order events chronologically with newest first
*/
export default function ActivityFeed() {
  // Get feed data and state from the useCheckIn hook
  const { feedItems, userId, isReconnecting, isConnected, error } =
    useCheckIn();

  // Local state for displaying temporary error messages
  const [localError, setLocalError] = useState<string | null>(null);

  // Display backend errors temporarily
  useEffect(() => {
    if (error) {
      setLocalError(error);
      const timer = setTimeout(() => setLocalError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Format timestamp in the requested format: "MM/DD/YYYY @ 1:00 PM"
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);

    // Format date part: MM/DD/YYYY
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    const year = date.getFullYear();

    // Format time part: 1:00 PM
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12; // Convert 0 to 12 for 12 AM

    return `${month}/${day}/${year} @ ${hours}:${minutes} ${ampm}`;
  };

  // Get event icon based on type
  const getEventIcon = (type: string) => {
    switch (type) {
      case "checkin":
        return <CheckSquare className="h-4 w-4" />;
      case "checkout":
        return <LogOut className="h-4 w-4" />;
      case "connection":
        return <Users className="h-4 w-4" />;
      case "disconnection":
        return <Users className="h-4 w-4" />;
      default:
        return null;
    }
  };

  // Get event background color based on type
  const getEventStyles = (type: string, isCurrentUser: boolean) => {
    let baseClasses = "p-3 rounded-md flex flex-col text-sm ";

    // Event type styling
    switch (type) {
      case "checkin":
        baseClasses += "bg-green-50 border-l-4 border-green-500 ";
        break;
      case "checkout":
        baseClasses += "bg-red-50 border-l-4 border-red-500 ";
        break;
      case "connection":
        baseClasses += "bg-blue-50 border-l-4 border-blue-500 ";
        break;
      case "disconnection":
        baseClasses += "bg-gray-50 border-l-4 border-gray-400 ";
        break;
      default:
        baseClasses += "bg-gray-50 border-l-4 border-gray-400 ";
    }

    // Highlight current user's events
    if (isCurrentUser) {
      baseClasses += "border-r-4 border-r-purple-300";
    }

    return baseClasses;
  };

  return (
    <div className="w-full flex flex-col h-full">
      {/* Header */}
      <div className="flex justify-between items-center mb-4 px-1">
        <h2 className="text-xl font-medium">Activity Feed</h2>
        <div className="flex items-center gap-2">
          {!isConnected && (
            <div className="flex items-center text-red-500 text-xs">
              <AlertCircle className="h-3 w-3 mr-1" />
              Disconnected
            </div>
          )}
          {isReconnecting && (
            <div className="flex items-center text-amber-500 text-xs">
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              Reconnecting...
            </div>
          )}
        </div>
      </div>

      {/* Error notification */}
      {localError && (
        <div className="mb-4 p-2 bg-red-100 text-red-800 rounded-md flex items-center text-sm">
          <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
          <span>{localError}</span>
        </div>
      )}

      {/* Feed content */}
      {/* Filter feedItems to only show check-in and check-out events */}
      {feedItems.filter(
        (item) => item.type === "checkin" || item.type === "checkout"
      ).length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-gray-500">
          <CheckSquare className="h-8 w-8 mb-2" />
          <p>No check-in activity yet</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <ul className="space-y-2 p-1">
            {feedItems
              .filter(
                (item) => item.type === "checkin" || item.type === "checkout"
              )
              .map((item, index) => (
                <li
                  key={index}
                  className={getEventStyles(item.type, item.user_id === userId)}
                >
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <div className="flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      <span>{formatTimestamp(item.timestamp)}</span>
                    </div>

                    {item.study_topic && (
                      <div className="flex items-center ml-2">
                        <BookOpen className="h-3 w-3 mr-1" />
                        <span className="font-medium">{item.study_topic}</span>
                      </div>
                    )}

                    {item.user_id === userId && (
                      <span className="ml-auto text-purple-600 font-medium">
                        You
                      </span>
                    )}
                  </div>

                  <div className="flex items-start">
                    <span className="mr-2 mt-0.5 flex-shrink-0">
                      {getEventIcon(item.type)}
                    </span>
                    <span className="text-gray-800">{item.message}</span>
                  </div>

                  {/* Room information for check-in/check-out events */}
                  {(item.type === "checkin" || item.type === "checkout") &&
                    item.room_name && (
                      <div className="mt-1 text-xs text-gray-500 ml-6">
                        Room: {item.room_name}
                      </div>
                    )}
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}
