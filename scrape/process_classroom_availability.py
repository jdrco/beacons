import json
import re
import logging

from datetime import datetime

# Set up logging
logging.basicConfig(level=logging.WARNING)
logger = logging.getLogger(__name__)

def is_before_date(date_str):
    """
    Check if the start date is before date (e.g. May 2025 which is end of current sem)
    Args:
        date_str (str): Date string in format "YYYY-MM-DD - YYYY-MM-DD (W)"
    Returns:
        bool: True if start date is before May 2025, False if after or on error
    """
    try:
        # Extract the start date (first date in the string)
        start_date = date_str.split(' - ')[0]
        date = datetime.strptime(start_date, '%Y-%m-%d')
        
        # Check if date is before May 2025
        cutoff_date = datetime(2025, 5, 1)
        return date < cutoff_date
    except (ValueError, IndexError) as e:
        logger.warning(f"Failed to parse date '{date_str}': {str(e)}")
        # On error, we'll consider it as after May 2025 to filter it out
        return False
    except Exception as e:
        logger.warning(f"Unexpected error processing date '{date_str}': {str(e)}")
        return False

def filter_schedules(data):
    """
    Remove schedules that have:
    1. TBD or ONLINE in their location
    2. Start dates in or after May 2025
    Args:
        data (dict): Dictionary of rooms and their schedules

    Returns:
        dict: Filtered dictionary with TBD/Online schedules removed
    """
    filtered_data = {}

    for room, schedules in data.items():
        filtered_schedules = [
            schedule for schedule in schedules 
            if not (isinstance(schedule.get("location"), str) and 
                   any(loc in schedule["location"].upper() 
                       for loc in ["TBD", "ONLINE"])) and
               is_before_date(schedule["dates"])
        ]

        # Only include rooms that have remaining schedules
        if filtered_schedules:
            filtered_data[room] = filtered_schedules

    return filtered_data

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
    with open('output/raw_classroom_availability.json', 'r') as file:
        input_data = json.load(file)
    
    # Filter out TBD and ONLINE schedules
    filtered_data = filter_schedules(input_data)
    
    # Group the data and include coordinates
    grouped_data = group_by_building(filtered_data, building_coords)
    
    # Write the grouped data to a new JSON file
    with open('output/processed_classroom_availability_winter.json', 'w') as file:
        json.dump(grouped_data, file, indent=2)

if __name__ == '__main__':
    main()