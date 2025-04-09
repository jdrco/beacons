"use client";

import { NavbarProps } from "@/types";
import SearchBar from "./Search";
import DisplaySettingsDropdown from "./DisplaySettings";
import { useEffect, useState } from "react";
import {
  LogOut,
  LogIn,
  Heart,
  AlignJustify,
  User2,
  MapPin,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Logo from "./Logo";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ProfilePhoto from "@/components/ProfilePhoto";

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DateTimePicker } from "./DateTimePicker";
import { useTime } from "@/contexts/TimeContext";
import { format } from "date-fns";

export default function Navbar({
  setSearchQuery,
  setDisplaySettings,
  displaySettings,
  currentDateTime,
  onLocationRequest,
  sortByDistance,
  toggleSortByDistance,
}: NavbarProps) {
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const { toast } = useToast();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const [isTimePickerDialogOpen, setIsTimePickerDialogOpen] = useState(false);
  const router = useRouter();
  const { currentTime, isCustomTime, setCustomTime, resetToRealTime } =
    useTime();
  const [time, setTime] = useState("");

  // Set formatted time
  useEffect(() => {
    // Use date-fns to format time in 12-hour format with AM/PM
    const formattedTime = format(currentTime, "h:mm a");
    setTime(formattedTime);
  }, [currentTime]);

  // Check if device is mobile
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint is 768px
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  // Handle time picker
  const handleTimeSelect = (date: Date | undefined) => {
    if (date) {
      setCustomTime(date);
      setIsTimePickerDialogOpen(false);
      setIsUserMenuOpen(false);
    }
  };

  const handleTimeReset = () => {
    resetToRealTime();
    setIsTimePickerDialogOpen(false);
    setIsUserMenuOpen(false);
  };

  // Handle opening the time picker modal
  const handleOpenTimePicker = () => {
    setIsTimePickerDialogOpen(true);
    if (isMobile) {
      setIsUserMenuOpen(false);
    }
  };

  // Handle search expansion state change
  const handleSearchExpandChange = (expanded: boolean) => {
    setIsSearchExpanded(expanded);
  };

  // Handle login button click
  const handleLoginClick = () => {
    router.push("/signin");
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "Success",
        description: "You have been logged out",
      });
      setIsLogoutDialogOpen(false);
    } catch {
      toast({
        title: "Error",
        description: "Failed to log out",
        variant: "destructive",
      });
    }
  };

  // Navigate to favorites page
  const handleFavoritesClick = () => {
    router.push("/favorites");
    setIsUserMenuOpen(false);
  };

  // Handle location button click
  const handleLocationButtonClick = () => {
    if (!sortByDistance) {
      onLocationRequest();
    }
    toggleSortByDistance();
    if (isMobile) {
      setIsUserMenuOpen(false);
    }
  };

  // User profile button or sign in button based on authentication status
  const renderUserControls = () => {
    if (isAuthenticated) {
      return (
        <div className="flex items-center gap-2">
          {/* Location button - Only visible on desktop */}
          {!isMobile && (
            <button
              className={cn(
                "rounded-full h-10 w-10 flex justify-center items-center",
                sortByDistance
                  ? "bg-[#4AA69D] text-white"
                  : "bg-white text-[#191f23]",
                "border-2 border-[#4AA69D]"
              )}
              onClick={handleLocationButtonClick}
              type="button"
              aria-label={
                sortByDistance ? "Sorting by distance" : "Sort by distance"
              }
            >
              <MapPin className="h-4 w-4" />
            </button>
          )}

          {/* Favorites button - only shown on desktop */}
          {!isMobile && (
            <button
              className="bg-white text-[#191f23] border-2 border-[#4AA69D] rounded-full h-10 w-10 flex justify-center items-center"
              onClick={handleFavoritesClick}
              type="button"
              aria-label="My Favorites"
            >
              <Heart className="h-4 w-4" />
            </button>
          )}

          <DropdownMenu open={isUserMenuOpen} onOpenChange={setIsUserMenuOpen}>
            <DropdownMenuTrigger asChild>
              <button
                className="bg-white text-[#191f23] border-2 border-[#4AA69D] rounded-full h-10 flex justify-center items-center px-2 gap-x-2"
                type="button"
              >
                <AlignJustify className="w-4 h-4 ml-1" />
                <ProfilePhoto
                  username={user?.username || ""}
                  is_navbar={true}
                />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => {
                  router.push("/profile");
                  setIsUserMenuOpen(false);
                }}
              >
                <User2 className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>

              {/* Mobile-only menu items */}
              {isMobile && (
                <>
                  {/* Location button in dropdown for mobile */}
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={handleLocationButtonClick}
                  >
                    <MapPin className="mr-2 h-4 w-4" />
                    <span>
                      {sortByDistance
                        ? "Sorting by distance"
                        : "Sort by distance"}
                    </span>
                  </DropdownMenuItem>

                  {/* Favorites in dropdown for mobile */}
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={handleFavoritesClick}
                  >
                    <Heart className="mr-2 h-4 w-4" />
                    <span>My Favorites</span>
                  </DropdownMenuItem>

                  {/* Time picker in dropdown for mobile */}
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={handleOpenTimePicker}
                  >
                    <Clock className="mr-2 h-4 w-4" />
                    <span>Set time</span>
                    <div className="ml-auto font-mono text-sm">
                      <span
                        className={cn(isCustomTime ? "text-[#4AA69D]" : "")}
                      >
                        {time}
                      </span>
                    </div>
                  </DropdownMenuItem>
                </>
              )}

              <DropdownMenuItem
                className="text-destructive focus:text-destructive cursor-pointer"
                onClick={() => setIsLogoutDialogOpen(true)}
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    } else {
      return (
        <div className="flex items-center gap-2">
          {/* Location button - Only visible on desktop for non-authenticated users */}
          {!isMobile && (
            <button
              className={cn(
                "rounded-full h-10 w-10 flex justify-center items-center",
                sortByDistance
                  ? "bg-[#4AA69D] text-white"
                  : "bg-white text-[#191f23]",
                "border-2 border-[#4AA69D]"
              )}
              onClick={handleLocationButtonClick}
              type="button"
              aria-label={
                sortByDistance ? "Sorting by distance" : "Sort by distance"
              }
            >
              <MapPin className="h-4 w-4" />
            </button>
          )}

          {/* For mobile, we need a menu even for non-authenticated users */}
          {isMobile ? (
            <DropdownMenu
              open={isUserMenuOpen}
              onOpenChange={setIsUserMenuOpen}
            >
              <DropdownMenuTrigger asChild>
                <button
                  className="bg-white text-[#191f23] border-2 border-[#4AA69D] rounded-full h-10 w-10 flex justify-center items-center"
                  type="button"
                >
                  <AlignJustify className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {/* Location button in dropdown for mobile */}
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={handleLocationButtonClick}
                >
                  <MapPin className="mr-2 h-4 w-4" />
                  <span>
                    {sortByDistance
                      ? "Sorting by distance"
                      : "Sort by distance"}
                  </span>
                </DropdownMenuItem>

                {/* Time picker in dropdown for mobile */}
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={handleOpenTimePicker}
                >
                  <Clock className="mr-2 h-4 w-4" />
                  <span>Set time</span>
                  <div className="ml-auto font-mono text-sm">
                    <span className={cn(isCustomTime ? "text-[#4AA69D]" : "")}>
                      {time}
                    </span>
                  </div>
                </DropdownMenuItem>

                {/* Sign in button in dropdown for mobile */}
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={handleLoginClick}
                >
                  <LogIn className="mr-2 h-4 w-4" />
                  <span>Sign In</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            // Desktop Sign In button
            <button
              className="bg-white text-[#191f23] rounded-full flex items-center justify-center gap-2 transition-colors hover:bg-gray-200 active:bg-gray-300 h-10 px-4"
              onClick={handleLoginClick}
              type="button"
            >
              <span className="font-medium text-sm">Sign In</span>
              <LogIn className="h-4 w-4" />
            </button>
          )}
        </div>
      );
    }
  };

  return (
    <>
      <div className="flex rounded-full justify-between mt-4 mx-3 md:mx-4 px-2 py-2 bg-[#2b5f5a48]">
        {/* Left section - Logo (hidden on mobile when search is expanded) */}
        {(!isSearchExpanded || !isMobile) && (
          <div className="flex justify-between items-center md:w-1/4 lg:w-1/3">
            <Link href="/">
              <Logo className="ml-2" />
            </Link>
            {/* Time display - only visible on desktop */}
            <div className="items-center whitespace-nowrap hidden lg:flex gap-2">
              <div className="flex items-center font-mono text-sm">
                <span className={cn(isCustomTime ? "text-[#4AA69D]" : "")}>
                  {time}
                </span>
                <span className="ml-3 font-bold">Edmonton</span>
              </div>
              <button
                className={cn(
                  "rounded-full h-8 w-8 flex justify-center items-center",
                  isCustomTime
                    ? "bg-[#4AA69D] text-white"
                    : "bg-[#2b5f5a48] text-white hover:bg-[#2b5f5a80]"
                )}
                onClick={handleOpenTimePicker}
                type="button"
                aria-label="Select time"
              >
                <Clock className="h-4 w-4" />
              </button>
            </div>
            <div></div>
          </div>
        )}

        {/* Middle section (only on desktop) */}
        {!isMobile && (
          <div className="flex items-center justify-center flex-1 w-full md:pr-1">
            <div className="flex items-center gap-x-2 w-full">
              {/* SearchBar */}
              <div className="flex items-center w-full">
                <SearchBar
                  onSearch={setSearchQuery}
                  onExpandChange={handleSearchExpandChange}
                />
              </div>

              {/* Display Settings */}
              <div className="h-10 aspect-square">
                <DisplaySettingsDropdown
                  onFilterChange={setDisplaySettings}
                  currentFilter={displaySettings}
                  currentDateTime={currentDateTime}
                />
              </div>
            </div>
          </div>
        )}

        {/* Right section - mobile view retains the original layout */}
        {isMobile && (
          <div
            className={cn(
              "flex items-center",
              isSearchExpanded ? "w-full" : ""
            )}
          >
            <div className={cn("flex w-full justify-end")}>
              {/* Controls group */}
              <div
                className={cn(
                  "flex items-center gap-x-2",
                  isSearchExpanded ? "w-full" : ""
                )}
              >
                {/* SearchBar */}
                <div
                  className={cn(
                    "flex items-center",
                    isSearchExpanded ? "w-full" : ""
                  )}
                >
                  <SearchBar
                    onSearch={setSearchQuery}
                    onExpandChange={handleSearchExpandChange}
                  />
                </div>

                {/* Display Settings */}
                <div className="h-10 aspect-square">
                  <DisplaySettingsDropdown
                    onFilterChange={setDisplaySettings}
                    currentFilter={displaySettings}
                    currentDateTime={currentDateTime}
                  />
                </div>

                {/* User Button (inside the controls group for mobile) */}
                {renderUserControls()}
              </div>
            </div>
          </div>
        )}

        {/* User Button (only for desktop, on right side) */}
        {!isMobile && (
          <div className="flex justify-end items-center md:w-1/3">
            {renderUserControls()}
          </div>
        )}
      </div>

      {/* Logout Confirmation Dialog */}
      <AlertDialog
        open={isLogoutDialogOpen}
        onOpenChange={setIsLogoutDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Logout</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to log out?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout}>
              Log out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Time Picker Dialog */}
      <Dialog
        open={isTimePickerDialogOpen}
        onOpenChange={setIsTimePickerDialogOpen}
      >
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-center text-lg mb-4">
              Set Time
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-6 py-2">
            <div className="flex justify-center">
              <DateTimePicker
                selected={currentTime}
                onSelect={handleTimeSelect}
                className="w-full max-w-[320px] mx-auto"
              />
            </div>
            {isCustomTime && (
              <Button
                variant="outline"
                onClick={handleTimeReset}
                className="flex items-center justify-center gap-2 mx-auto w-full max-w-[280px]"
              >
                <LogOut className="h-4 w-4" />
                <span>Reset to current time</span>
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
