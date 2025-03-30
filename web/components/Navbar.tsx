import { NavbarProps } from "@/types";
import SearchBar from "./Search";
import DisplaySettingsDropdown from "./DisplaySettings";
import { useEffect, useState } from "react";
import { LogIn } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Navbar({
  setSearchQuery,
  setDisplaySettings,
  displaySettings,
  currentDateTime,
}: NavbarProps) {
  const [time, setTime] = useState("");
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

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

  return (
    <div className="flex rounded-full justify-between mt-4 mx-3 md:mx-4 px-2 md:px-4 py-2 bg-[#2b5f5a48]">
      {/* Left section - Logo (hidden on mobile when search is expanded) */}
      {(!isSearchExpanded || !isMobile) && (
        <div className="flex items-center gap-x-20">
          <div className="relative flex gap-x-3 items-center ml-2">
            <img
              src="/beacons-symbol.svg"
              alt="Beacons Logo"
              className="block next-image-unconstrained h-7"
            />
            <img
              src="/beacons-text.svg"
              alt="Beacons Logo"
              className="block next-image-unconstrained h-5"
            />
          </div>
          {/* Time */}
          <div className="items-center whitespace-nowrap font-mono text-sm flex md:block hidden">
            <span>{time}</span>
            <span className="ml-2 font-bold">Edmonton</span>
          </div>
        </div>
      )}

      {/* Middle section (only on desktop) */}
      {!isMobile && (
        <div className="flex items-center justify-center flex-1">
          <div className="flex items-center gap-x-4 md:w-1/2">
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
          className={cn("flex items-center", isSearchExpanded ? "w-full" : "")}
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

              {/* Login Button (inside the controls group for mobile) */}
              <button className="bg-white rounded-full h-10 aspect-square flex justify-center items-center">
                <LogIn className="h-4 w-4 text-[#191f23]" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Login Button (only for desktop, on right side) */}
      {!isMobile && (
        <div className="flex items-center">
          <button className="bg-white rounded-full h-10 aspect-square flex justify-center items-center">
            <LogIn className="h-4 w-4 text-[#191f23]" />
          </button>
        </div>
      )}
    </div>
  );
}
