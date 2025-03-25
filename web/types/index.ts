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
