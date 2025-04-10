"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useFavorites } from "@/hooks/useFavorites";
import Logo from "@/components/Logo";
import Link from "next/link";
import {
  ChevronLeft,
  DoorOpen,
  Star,
  Trash2,
  Bell,
  BellOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";

/*
  4.6 Notifications

  REQ-1: The system shall send notifications to users when their favourite rooms become available, including the room name and building location in the notification content.

  REQ-2: The system shall provide users with granular controls to enable or disable notifications for each of their favourite rooms individually.

  REQ-3: The system shall verify and respect device-level notification permissions before attempting to send any notifications.
*/
export default function FavoritesPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const {
    favorites,
    isLoading,
    error,
    toggleFavorite,
    fetchFavorites,
    toggleNotification,
    getNotificationStatus,
  } = useFavorites();
  const [roomToDelete, setRoomToDelete] = useState<string | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/signin");
    }
  }, [isAuthenticated, authLoading, router]);

  // Refresh favorites when component mounts
  useEffect(() => {
    if (isAuthenticated) {
      fetchFavorites();
    }
  }, [isAuthenticated, fetchFavorites]);

  const handleRemoveFavorite = async (roomName: string) => {
    await toggleFavorite(roomName, false);
    setRoomToDelete(null);
  };

  const handleToggleNotification = async (roomName: string) => {
    await toggleNotification(roomName);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#171b1f]">
      {/* Header */}
      <header className="p-4 bg-[#1e2329] border-b border-gray-800">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/home" className="text-gray-300 hover:text-white">
              <ChevronLeft />
            </Link>
            <Logo />
          </div>
          <h1 className="text-xl font-bold text-white">Favorites</h1>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 container mx-auto p-4 md:p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : error ? (
          <div className="text-center p-8">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={fetchFavorites}>Try Again</Button>
          </div>
        ) : favorites.length === 0 ? (
          <div className="text-center p-8 bg-[#1e2329] rounded-lg border border-gray-800">
            <Star className="mx-auto h-12 w-12 text-gray-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Favorite Rooms</h2>
            <p className="text-gray-400 mb-6">
              You haven&apos;t added any rooms to your favorites yet.
            </p>
            <Button asChild>
              <Link href="/home">Browse Rooms</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {favorites.map((roomName) => (
              <Card key={roomName} className="bg-[#1e2329] border-gray-800">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <DoorOpen className="h-5 w-5 text-primary" />
                      <CardTitle>{roomName}</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2 mr-2">
                        <Switch
                          checked={getNotificationStatus(roomName)}
                          onCheckedChange={() =>
                            handleToggleNotification(roomName)
                          }
                          aria-label="Toggle notifications"
                        />
                        {getNotificationStatus(roomName) ? (
                          <Bell className="h-4 w-4 text-primary" />
                        ) : (
                          <BellOff className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setRoomToDelete(roomName)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                {/* <CardFooter>
                  <Button variant="outline" className="w-full" asChild>
                    <Link href={`/home?room=${roomName}`}>View Room</Link>
                  </Button>
                </CardFooter> */}
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={!!roomToDelete}
        onOpenChange={(open) => !open && setRoomToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from Favorites?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this room from your favorites?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600"
              onClick={() => roomToDelete && handleRemoveFavorite(roomToDelete)}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
