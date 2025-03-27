import { NavbarProps } from "@/types";
import SearchBar from "./Search";
import DisplaySettingsDropdown from "./DisplaySettings";

export default function Navbar({
  setSearchQuery,
  setDisplaySettings,
  displaySettings,
  currentDateTime,
}: NavbarProps) {
  return (
    <div className="flex flex-col md:flex-row w-full md:gap-8">
      <div className="flex gap-2 md:gap-4 md:w-2/3 order-last md:order-first">
        <SearchBar onSearch={setSearchQuery} />
        <DisplaySettingsDropdown
          onFilterChange={setDisplaySettings}
          currentFilter={displaySettings}
          currentDateTime={currentDateTime}
        />
      </div>
      <div className="order-first md:order-last flex justify-center items-center md:w-1/3 relative">
        <div className="relative">
          <img
            src="/beacons_logo.svg"
            alt="Beacons Logo"
            className="block next-image-unconstrained md:h-12 h-8 md:mb-0 mb-3"
          />
        </div>
      </div>
    </div>
  );
}
