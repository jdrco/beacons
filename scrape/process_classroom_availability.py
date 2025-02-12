import json
import requests
import re
import logging
from datetime import datetime

# Set up logging
logging.basicConfig(level=logging.WARNING)
logger = logging.getLogger(__name__)

def normalize_schedule(schedule):
    """
    Normalize schedule by swapping date and time fields if they are in wrong fields.
    Args:
        schedule (dict): Schedule dictionary with dates and time fields
    Returns:
        dict: Schedule with normalized date and time fields
    """
    # Check if dates field contains time format (HH:MM - HH:MM)
    time_pattern = re.compile(r'^\d{2}:\d{2}\s*-\s*\d{2}:\d{2}$')
    date_pattern = re.compile(r'^\d{4}-\d{2}-\d{2}(?:\s*-\s*\d{4}-\d{2}-\d{2})?.*$')
    
    if (time_pattern.match(schedule.get("dates", "")) and 
        date_pattern.match(schedule.get("time", ""))):
        # Swap the fields
        schedule["dates"], schedule["time"] = schedule["time"], schedule["dates"]
    
    return schedule

def is_before_date(date_str):
    """
    Check if the start date is before date (e.g. May 2025 which is end of current sem)
    Args:
        date_str (str): Date string in format "YYYY-MM-DD - YYYY-MM-DD (W)" or "YYYY-MM-DD"
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
        # On error, we'll keep it as may be a different edge case
        return True
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
        filtered_schedules = []
        for schedule in schedules:
            # Normalize the schedule (swap date/time if needed)
            normalized_schedule = normalize_schedule(schedule)
            
            # Apply filters
            if not (isinstance(normalized_schedule.get("location"), str) and 
                   any(loc in normalized_schedule["location"].upper() 
                       for loc in ["TBD", "ONLINE"])) and \
               is_before_date(normalized_schedule["dates"]):
                filtered_schedules.append(normalized_schedule)

        # Only include rooms that have remaining schedules
        if filtered_schedules:
            filtered_data[room] = filtered_schedules

    return filtered_data

def fetch_coordinates():
    """
    Fetch and parse building coordinates from UAlberta maps API.
    
    Returns:
        dict: Dictionary mapping building codes to their coordinates
    """
    url = 'https://www.ualberta.ca/api/maps/0/2048'
    coordinates = {}
    
    try:
        response = requests.get(url)
        data = response.json()
        
        for building in data['data']['Labels']:
            # Skip empty building names
            if not building.get('Name'):
                continue
                
            # Clean building name and extract abbreviation
            name = re.sub(r'\u003Cbr\/\u003E', ' ', building['Name']).strip()
            
            # Skip if name is empty after cleaning
            if not name:
                continue
            
            # Try to get abbreviation from parentheses first
            abbr_match = re.search(r'\(([^)]+)\)$', name)
            if abbr_match:
                building_code = abbr_match.group(1).strip()
            else:
                # If no parentheses, take first word and clean it
                words = name.split()
                if not words:  # Skip if no words after splitting
                    continue
                building_code = words[0].strip().upper()
                
                # Skip if building code is empty after cleaning
                if not building_code:
                    continue
            
            # Store coordinates
            coordinates[building_code] = {
                'latitude': building['Coords']['lat'],
                'longitude': building['Coords']['lng']
            }
            
            # Debug print to see what's being processed
            logger.debug(f"Processed building: {name} -> {building_code}")
        
        return coordinates
        
    except requests.RequestException as e:
        logger.error(f"Error fetching building data from API: {e}")
        return {}
    except json.JSONDecodeError as e:
        logger.error(f"Error parsing JSON response: {e}")
        return {}
    except Exception as e:
        logger.error(f"Unexpected error while parsing coordinates: {e}")
        return {}

# TODO: Fix when no matching key, results in null coordinate
def group_by_building(data, coordinates):
    """
    Group classroom data by building and add coordinates.
    
    Args:
        data (dict): Dictionary of rooms and their schedules
        coordinates (dict): Dictionary of building codes mapping to coordinate data
            Example format: {
                'CAB': {'latitude': 53.5264, 'longitude': -113.5276}
            }
    
    Returns:
        dict: Grouped data by building with coordinates
    """
    grouped = {}
    
    for room, schedules in data.items():
        # Extract building acronym (everything before the first space)
        building = room.split(' ')[0]
        
        # Initialize dict for building if it doesn't exist
        if building not in grouped:
            building_coords = coordinates.get(building)
            if building_coords:
                coords = {
                    'latitude': building_coords['latitude'],
                    'longitude': building_coords['longitude']
                }
            else:
                coords = None
                
            grouped[building] = {
                'coordinates': coords,
                'rooms': {}
            }
            
        # Add the room data under the building's rooms
        grouped[building]['rooms'][room] = schedules
    
    return grouped

def fetch_coordinates():
    """
    Fetch and parse building coordinates from UAlberta maps API.
    
    Returns:
        dict: Dictionary mapping building codes to their coordinates
    """
    url = 'https://www.ualberta.ca/api/maps/0/2048'
    coordinates = {}
    
    try:
        response = requests.get(url)
        data = response.json()
        
        for building in data['data']['Labels']:
            # Skip empty building names
            if not building.get('Name'):
                continue
                
            # Clean building name and extract abbreviation
            name = re.sub(r'\u003Cbr\/\u003E', ' ', building['Name']).strip()
            
            # Skip if name is empty after cleaning
            if not name:
                continue
            
            # Try to get abbreviation from parentheses first
            abbr_match = re.search(r'\(([^)]+)\)$', name)
            if abbr_match:
                building_code = abbr_match.group(1).strip()
            else:
                # If no parentheses, take first word and clean it
                words = name.split()
                if not words:  # Skip if no words after splitting
                    continue
                building_code = words[0].strip().upper()
                
                # Skip if building code is empty after cleaning
                if not building_code:
                    continue
            
            # Store coordinates
            coordinates[building_code] = {
                'latitude': building['Coords']['lat'],
                'longitude': building['Coords']['lng']
            }
            
            # Debug print to see what's being processed
            logger.debug(f"Processed building: {name} -> {building_code}")
        
        return coordinates
        
    except requests.RequestException as e:
        logger.error(f"Error fetching building data from API: {e}")
        return {}
    except json.JSONDecodeError as e:
        logger.error(f"Error parsing JSON response: {e}")
        return {}
    except Exception as e:
        logger.error(f"Unexpected error while parsing coordinates: {e}")
        return {}

def main():
    # Read the coordinates
    building_coords = fetch_coordinates()
    
    # Read the classroom availability JSON file
    with open('output/raw_classroom_availability.json', 'r') as file:
        input_data = json.load(file)
    
    # Filter out TBD and ONLINE schedules
    filtered_data = filter_schedules(input_data)
    
    # Group the data and include coordinates
    grouped_data = group_by_building(filtered_data, building_coords)
    
    # Write the grouped data to a new JSON file
    with open('output/processed_classroom_availability_winter_0212.json', 'w') as file:
        json.dump(grouped_data, file, indent=2)

if __name__ == '__main__':
    main()