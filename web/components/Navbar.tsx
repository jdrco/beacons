"use client";

import { NavbarProps } from "@/types";
import SearchBar from "./Search";
import DisplaySettingsDropdown from "./DisplaySettings";
import { useEffect, useState } from "react";
import { LogOut, User } from "lucide-react";
import { cn } from "@/lib/utils";
import Logo from "./Logo";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/useToast";
import Link from "next/link";
import { useRouter } from "next/navigation";

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

export default function Navbar({
  setSearchQuery,
  setDisplaySettings,
  displaySettings,
  currentDateTime,
}: NavbarProps) {
  const [time, setTime] = useState("");
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const { toast } = useToast();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const router = useRouter();

  // Update time every second
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, "0");
      const minutes = now.getMinutes().toString().padStart(2, "0");
      const seconds = now.getSeconds().toString().padStart(2, "0");
      setTime(`${hours}:${minutes}:${seconds}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Check if device is mobile
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint is 768px
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  // Handle search expansion state change
  const handleSearchExpandChange = (expanded: boolean) => {
    setIsSearchExpanded(expanded);
  };

  // Handle login button click
  const handleLoginClick = () => {
    // Redirect to login page
    window.location.href = "/signin";
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

  return (
    <>
      <div className="flex rounded-full justify-between mt-4 mx-3 md:mx-4 px-2 py-2 bg-[#2b5f5a48]">
        {/* Left section - Logo (hidden on mobile when search is expanded) */}
        {(!isSearchExpanded || !isMobile) && (
          <div className="flex items-center md:gap-x-24 md:w-1/4 lg:w-1/3">
            <Link href="/">
              <Logo className="ml-2" />
            </Link>
            {/* Time */}
            <div className="items-center whitespace-nowrap font-mono text-sm hidden lg:flex">
              <span>{time}</span>
              <span className="ml-3 font-bold pr-2">Edmonton</span>
            </div>
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
                {isAuthenticated ? (
                  <DropdownMenu
                    open={isUserMenuOpen}
                    onOpenChange={setIsUserMenuOpen}
                  >
                    <DropdownMenuTrigger asChild>
                      <button
                        className="bg-primary text-primary-foreground rounded-full h-10 aspect-square flex justify-center items-center"
                        type="button"
                      >
                        <User className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem
                        className="cursor-default"
                        onClick={() => router.push("/profile")}
                      >
                        <div>
                          <p className="font-medium">
                            {user?.username || "User"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {user?.email}
                          </p>
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive cursor-pointer"
                        onClick={() => setIsLogoutDialogOpen(true)}
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Log out</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <button
                    className="bg-white rounded-full h-10 aspect-square flex justify-center items-center"
                    onClick={handleLoginClick}
                    type="button"
                  >
                    <User className="h-4 w-4 text-[#191f23]" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* User Button (only for desktop, on right side) */}
        {!isMobile && (
          <div className="flex justify-end items-center md:w-1/3">
            {isAuthenticated ? (
              <DropdownMenu
                open={isUserMenuOpen}
                onOpenChange={setIsUserMenuOpen}
              >
                <DropdownMenuTrigger asChild>
                  <button
                    className="bg-primary text-primary-foreground rounded-full h-10 aspect-square flex justify-center items-center"
                    type="button"
                  >
                    <User className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem
                    className="cursor-default"
                    onClick={() => router.push("/profile")}
                  >
                    <div>
                      <p className="font-medium">{user?.username || "User"}</p>
                      <p className="text-xs text-muted-foreground">
                        {user?.email}
                      </p>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive cursor-pointer"
                    onClick={() => setIsLogoutDialogOpen(true)}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <button
                className="bg-white rounded-full h-10 aspect-square flex justify-center items-center"
                onClick={handleLoginClick}
                type="button"
              >
                <User className="h-4 w-4 text-[#191f23]" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Account Alert Dialog (for not authenticated users) */}
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Account Settings</AlertDialogTitle>
            <AlertDialogDescription>
              Account settings coming soon
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
    </>
  );
}
