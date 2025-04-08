export type DisplaySettings = "all" | "available" | "limited" | "unavailable";

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Schedule {
  dates: string;
  time: string;
  location: string;
  capacity: number;
  course: string;
}

export interface Room {
  [roomName: string]: Schedule[];
}

export interface Building {
  coordinates: Coordinates;
  rooms: Room;
}

export interface BuildingData {
  [buildingName: string]: Building;
}

export interface DisplaySettingsProps {
  onFilterChange: (filter: DisplaySettings) => void;
  currentFilter: DisplaySettings;
  currentDateTime: Date;
}

export interface NavbarProps {
  setSearchQuery: (query: string) => void;
  setDisplaySettings: (settings: DisplaySettings) => void;
  displaySettings: DisplaySettings;
  currentDateTime: Date; // We'll still pass this for now, but it will come from the TimeContext
  onLocationRequest: () => void;
  sortByDistance: boolean;
  toggleSortByDistance: () => void;
}
