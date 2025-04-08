"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
} from "react";
import { useAuth } from "@/contexts/AuthContext";

// Types for feed events
type FeedEventType =
  | "connection"
  | "disconnection"
  | "checkin"
  | "checkout"
  | "history";

type FeedItem = {
  type: FeedEventType;
  timestamp: string;
  message: string;
  user_id?: string;
  username?: string;
  room_id?: string;
  room_name?: string;
  study_topic?: string;
  expiry_time?: string;
  current_occupancy?: number;
};

type HistoryMessage = {
  type: "history";
  feed: FeedItem[];
  user_id?: string;
  username?: string;
  current_checkins: FeedItem[];
  occupancy_data?: Record<string, number>;
};

// Context types
interface CheckInContextType {
  // Connection state
  isConnected: boolean;
  isReconnecting: boolean;

  // User state
  userId: string | null;

  // Check-in state
  isCheckedIn: boolean;
  checkedInRoom: { id: string; name: string } | null;
  studyTopic: string | null;

  // Feed data
  feedItems: FeedItem[];

  // Occupancy data
  roomOccupancy: Record<string, number>; // Maps room names to occupant counts
  getBuildingOccupancy: (buildingName: string) => number; // Gets total occupancy for a building

  // Loading state
  isLoading: boolean;
  error: string | null;

  // Actions
  checkIn: (roomId: string, roomName: string, studyTopic?: string) => void;
  checkOut: () => void;
}

// Create context
const CheckInContext = createContext<CheckInContextType>({
  isConnected: false,
  isReconnecting: false,
  userId: null,
  isCheckedIn: false,
  checkedInRoom: null,
  studyTopic: null,
  feedItems: [],
  roomOccupancy: {},
  getBuildingOccupancy: () => 0,
  isLoading: false,
  error: null,
  checkIn: () => {},
  checkOut: () => {},
});

// Static reference to WebSocket to prevent multiple connections
let globalWebSocket: WebSocket | null = null;
let reconnectTimeout: NodeJS.Timeout | null = null;
let pingInterval: NodeJS.Timeout | null = null;
let isConnecting = false;

// Provider component
export function CheckInProvider({ children }: { children: ReactNode }) {
  // State
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isReconnecting, setIsReconnecting] = useState<boolean>(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isCheckedIn, setIsCheckedIn] = useState<boolean>(false);
  const [checkedInRoom, setCheckedInRoom] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [studyTopic, setStudyTopic] = useState<string | null>(null);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [roomOccupancy, setRoomOccupancy] = useState<Record<string, number>>(
    {}
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Auth context
  const { user } = useAuth();

  // Track mount status to prevent state updates after unmount
  const isMountedRef = useRef(true);

  // Function to get total occupancy for a building
  const getBuildingOccupancy = (buildingName: string): number => {
    // Extract the building prefix from room names (e.g. "DM" from "DM-101")
    let total = 0;
    Object.entries(roomOccupancy).forEach(([roomName, count]) => {
      if (
        roomName.startsWith(buildingName + "-") ||
        roomName.startsWith(buildingName + " ")
      ) {
        total += count;
      }
    });
    return total;
  };

  // Connect to WebSocket
  useEffect(() => {
    if (!user) {
      // User is not authenticated, don't try to connect
      return;
    }
    const connectWebSocket = () => {
      // If already connecting or connected, don't create a new connection
      if (
        isConnecting ||
        (globalWebSocket && globalWebSocket.readyState === WebSocket.OPEN)
      ) {
        return;
      }

      isConnecting = true;
      setIsReconnecting(true);

      // TODO: make configurable based on env
      const isIOS =
        typeof navigator !== "undefined" &&
        /iPhone|iPad|iPod/.test(navigator.userAgent);
      const wsUrl = isIOS
        ? "ws://100.98.95.126:8000/ws"
        : "ws://localhost:8000/ws";

      console.log("Creating new WebSocket connection...");
      const ws = new WebSocket(wsUrl);
      globalWebSocket = ws;

      ws.onopen = () => {
        console.log("Connected to WebSocket");
        isConnecting = false;
        if (isMountedRef.current) {
          setIsConnected(true);
          setIsReconnecting(false);
        }

        // Send username if available
        if (user?.username) {
          ws.send(
            JSON.stringify({
              type: "setUsername",
              username: user.username,
            })
          );
        }
      };

      ws.onmessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          console.log("WebSocket received message:", data);

          // Handle history message
          if (data.type === "history" && "feed" in data) {
            // Set the feed
            const sortedFeed = data.feed.sort(
              (a: FeedItem, b: FeedItem) =>
                new Date(b.timestamp).getTime() -
                new Date(a.timestamp).getTime()
            );

            if (isMountedRef.current) {
              setFeedItems(sortedFeed);

              // Set user ID
              if (data.user_id) {
                setUserId(data.user_id);
              }

              // Initialize room occupancy data from occupancy_data
              if (
                data.occupancy_data &&
                typeof data.occupancy_data === "object"
              ) {
                setRoomOccupancy(data.occupancy_data);
              }

              // Check if user is already checked in
              if (
                data.current_checkins &&
                Array.isArray(data.current_checkins)
              ) {
                const myCheckin = data.current_checkins.find(
                  (checkin: FeedItem) => checkin.user_id === data.user_id
                );

                if (myCheckin) {
                  setIsCheckedIn(true);
                  setCheckedInRoom({
                    id: myCheckin.room_id || "",
                    name: myCheckin.room_name || "",
                  });
                  setStudyTopic(myCheckin.study_topic || null);
                }
              }
            }
          }
          // Handle individual events
          else if ((data as FeedItem).type) {
            const newEvent = data as FeedItem;

            if (
              newEvent.room_name &&
              typeof newEvent.current_occupancy === "number"
            ) {
              const roomName = newEvent.room_name;
              const count = newEvent.current_occupancy;

              setRoomOccupancy((prev) => {
                const updated = { ...prev };
                updated[roomName] = count;
                return updated;
              });
            }

            // Add to feed - with deduplication
            if (isMountedRef.current) {
              setFeedItems((prevFeed) => {
                // Check for duplicates by comparing timestamps and user_id
                const isDuplicate = prevFeed.some(
                  (item) =>
                    item.type === newEvent.type &&
                    item.user_id === newEvent.user_id &&
                    item.room_id === newEvent.room_id &&
                    Math.abs(
                      new Date(item.timestamp).getTime() -
                        new Date(newEvent.timestamp).getTime()
                    ) < 1000 // within 1 second
                );

                if (isDuplicate) return prevFeed;

                const updatedFeed = [...prevFeed, newEvent];
                return updatedFeed.sort(
                  (a, b) =>
                    new Date(b.timestamp).getTime() -
                    new Date(a.timestamp).getTime()
                );
              });

              // Handle check-in/check-out for current user
              if (newEvent.user_id === userId) {
                if (newEvent.type === "checkin") {
                  setIsCheckedIn(true);
                  setCheckedInRoom({
                    id: newEvent.room_id || "",
                    name: newEvent.room_name || "",
                  });
                  setStudyTopic(newEvent.study_topic || null);
                } else if (newEvent.type === "checkout") {
                  setIsCheckedIn(false);
                  setCheckedInRoom(null);
                  setStudyTopic(null);
                }
              }
            }
          }
          // Handle occupancy update broadcasts
          else if (
            data.type === "occupancyUpdate" &&
            data.room_name &&
            typeof data.count === "number"
          ) {
            setRoomOccupancy((prev) => ({
              ...prev,
              [data.room_name]: data.count,
            }));
          }

          // Handle error messages
          if (data.type === "error" && isMountedRef.current) {
            setError(data.message);
            setTimeout(() => {
              if (isMountedRef.current) {
                setError(null);
              }
            }, 5000);
          }
        } catch (err) {
          console.error("Error parsing WebSocket message:", err);
        }
      };

      ws.onclose = () => {
        console.log("Disconnected from WebSocket");
        globalWebSocket = null;
        isConnecting = false;

        if (isMountedRef.current) {
          setIsConnected(false);
        }

        // Attempt to reconnect
        if (reconnectTimeout) {
          clearTimeout(reconnectTimeout);
        }

        reconnectTimeout = setTimeout(() => {
          console.log("Attempting to reconnect...");
          if (isMountedRef.current) {
            connectWebSocket();
          }
        }, 3000);
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        isConnecting = false;
        ws.close();
      };

      // Send a ping message every 25 seconds to keep the connection alive
      if (pingInterval) {
        clearInterval(pingInterval);
      }

      pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send("ping");
        }
      }, 25000);
    };

    // Set isMounted ref to true on mount
    isMountedRef.current = true;

    // Only create a new WebSocket if one doesn't exist already
    if (!globalWebSocket || globalWebSocket.readyState !== WebSocket.OPEN) {
      connectWebSocket();
    } else {
      // If WebSocket exists, just send username update
      if (user?.username && globalWebSocket.readyState === WebSocket.OPEN) {
        globalWebSocket.send(
          JSON.stringify({
            type: "setUsername",
            username: user.username,
          })
        );
      }
      setIsConnected(true);
    }

    // Cleanup function to run on unmount
    return () => {
      isMountedRef.current = false;

      // Don't close the WebSocket on component unmount
      // Instead, we'll keep it alive for the entire session
      // and manage it globally

      // But do clean up any local timers/intervals
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [user, user?.username]); // Only re-run if username changes

  // Check-in function
  const checkIn = (roomId: string, roomName: string, studyTopic?: string) => {
    if (!globalWebSocket || globalWebSocket.readyState !== WebSocket.OPEN) {
      setError("WebSocket connection not available");
      return;
    }

    setIsLoading(true);

    const checkInData = {
      type: "checkin",
      room_id: roomId,
      room_name: roomName,
      study_topic: studyTopic || undefined,
      username: user?.username,
    };

    globalWebSocket.send(JSON.stringify(checkInData));

    // The state will be updated when we receive confirmation from the server
    setTimeout(() => {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }, 500);
  };

  // Check-out function
  const checkOut = () => {
    if (!globalWebSocket || globalWebSocket.readyState !== WebSocket.OPEN) {
      setError("WebSocket connection not available");
      return;
    }

    setIsLoading(true);

    const checkOutData = {
      type: "checkout",
    };

    globalWebSocket.send(JSON.stringify(checkOutData));

    // The state will be updated when we receive confirmation from the server
    setTimeout(() => {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }, 500);
  };

  // Context value
  const value = {
    isConnected,
    isReconnecting,
    userId,
    isCheckedIn,
    checkedInRoom,
    studyTopic,
    feedItems,
    roomOccupancy,
    getBuildingOccupancy,
    isLoading,
    error,
    checkIn,
    checkOut,
  };

  return (
    <CheckInContext.Provider value={value}>{children}</CheckInContext.Provider>
  );
}

// Hook for using the context
export const useCheckIn = () => useContext(CheckInContext);
