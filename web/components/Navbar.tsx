import { NavbarProps } from "@/types";
import SearchBar from "./Search";
import DisplaySettingsDropdown from "./DisplaySettings";
import { useEffect, useState } from "react";

export default function Navbar({
  setSearchQuery,
  setDisplaySettings,
  displaySettings,
  currentDateTime,
}: NavbarProps) {
  const [time, setTime] = useState("");
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, "0");
      const minutes = now.getMinutes().toString().padStart(2, "0");
      const seconds = now.getSeconds().toString().padStart(2, "0");
      setTime(`${hours}:${minutes}:${seconds}`);
    };

    // Update immediately and then every second
    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  // Handle search expansion state change
  const handleSearchExpandChange = (expanded: boolean) => {
    setIsSearchExpanded(expanded);
  };

  return (
    <div className="flex rounded-full justify-between md:justify-start mt-4 mx-3 md:mx-4 px-3 md:px-5 py-2 bg-[#2b5f5a48]">
      {/* Left section - Logo */}
      <div
        className={`flex justify-left items-center md:w-1/4 ${
          isSearchExpanded ? "hidden md:flex" : ""
        }`}
      >
        <div className="relative flex gap-x-4 items-center">
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
      </div>

      {/* Middle section - Time, Search, Display Settings */}
      <div
        className={`flex gap-2 md:gap-12 ${
          isSearchExpanded ? "w-full" : "md:w-1/2"
        } items-center rounded-full`}
      >
        <div className="items-center whitespace-nowrap font-mono text-sm hidden md:flex">
          <span>{time}</span>
          <span className="ml-2 font-bold">Edmonton</span>
        </div>
        <div className="flex h-full items-center w-full gap-x-2 md:gap-x-3">
          <SearchBar
            onSearch={setSearchQuery}
            onExpandChange={handleSearchExpandChange}
          />
          <DisplaySettingsDropdown
            onFilterChange={setDisplaySettings}
            currentFilter={displaySettings}
            currentDateTime={currentDateTime}
          />
        </div>
      </div>

      {/* Right section - Login */}
      {/* <div className="flex gap-2 md:gap-3 md:w-1/4 justify-end items-center">
        Login
      </div> */}
    </div>
  );
}
