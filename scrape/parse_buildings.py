import json
import re

def parse_coordinates(buildings_file):
    """Parse the buildings.txt file to extract building codes and their coordinates."""
    coordinates = {}
    with open(buildings_file, 'r') as file:
        for line in file:
            # Skip lines that don't contain building information
            if not line.strip() or line.startswith('==='):
                continue
            
            # Extract building code and coordinates using regex
            match = re.match(r'-\s+(\w+)\s+@?([@\d.,\-]+)?', line.strip())
            if match:
                building_code, coords = match.groups()
                if coords:
                    # Clean up coordinates and convert to list of floats
                    coords = coords.strip('@').split(',')
                    try:
                        lat, lon = map(float, coords)
                        coordinates[building_code] = {'latitude': lat, 'longitude': lon}
                    except ValueError:
                        # Handle malformed coordinates
                        coordinates[building_code] = None
                else:
                    # Handle buildings without coordinates (like 'TBD' or 'ONLINE')
                    coordinates[building_code] = None
    
    return coordinates

def group_by_building(data, coordinates):
    """Group classroom data by building and add coordinates."""
    grouped = {}
    
    for room, schedules in data.items():
        # Extract building acronym (everything before the first space)
        building = room.split(' ')[0]
        
        # Initialize dict for building if it doesn't exist
        if building not in grouped:
            grouped[building] = {
                'coordinates': coordinates.get(building),
                'rooms': {}
            }
            
        # Add the room data under the building's rooms
        grouped[building]['rooms'][room] = schedules
        
    return grouped

def main():
    # Read the coordinates
    building_coords = parse_coordinates('building_coordinates.txt')
    
    # Read the classroom availability JSON file
    with open('output/classroom_availability.json', 'r') as file:
        input_data = json.load(file)
    
    # Group the data and include coordinates
    grouped_data = group_by_building(input_data, building_coords)
    
    # Write the grouped data to a new JSON file
    with open('output/grouped_by_building.json', 'w') as file:
        json.dump(grouped_data, file, indent=2)

if __name__ == '__main__':
    main()