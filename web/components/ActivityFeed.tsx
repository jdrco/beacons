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

  // Format the timestamp for display
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Format date for longer timestamp display
  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  // Show relative time (e.g., "2 minutes ago")
  const getRelativeTime = (timestamp: string) => {
    const now = new Date();
    const eventTime = new Date(timestamp);
    const diffMs = now.getTime() - eventTime.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);

    if (diffSeconds < 60) {
      return "just now";
    } else if (diffSeconds < 3600) {
      const mins = Math.floor(diffSeconds / 60);
      return `${mins} ${mins === 1 ? "minute" : "minutes"} ago`;
    } else if (diffSeconds < 86400) {
      const hours = Math.floor(diffSeconds / 3600);
      return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
    } else {
      // If more than a day, show the date
      return formatDate(timestamp);
    }
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
                      <span title={new Date(item.timestamp).toLocaleString()}>
                        {getRelativeTime(item.timestamp)}
                      </span>
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
