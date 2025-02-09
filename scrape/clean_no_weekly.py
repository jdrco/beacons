import json

def has_weekly_pattern(date_str):
    """
    Check if the date string contains a weekly pattern in parentheses
    e.g., "2025-01-06 - 2025-04-09 (TR)" returns True
    but "2025-01-17" returns False
    """
    return '(' in date_str and ')' in date_str

def clean_schedules(input_path, output_path):
    # Read the input JSON file
    with open(input_path, 'r') as f:
        data = json.load(f)
    
    # Create a deep copy to modify
    cleaned_data = {}
    
    # Process each building
    for building_code, building_info in data.items():
        cleaned_data[building_code] = {
            'coordinates': building_info['coordinates'],
            'rooms': {}
        }
        
        # Process each room
        for room_number, schedules in building_info['rooms'].items():
            # Filter out schedules without weekly patterns
            weekly_schedules = [
                schedule for schedule in schedules 
                if has_weekly_pattern(schedule['dates'])
            ]
            
            # Only include rooms that have remaining schedules
            if weekly_schedules:
                cleaned_data[building_code]['rooms'][room_number] = weekly_schedules
    
    # Write the cleaned data to output file
    with open(output_path, 'w') as f:
        json.dump(cleaned_data, f, indent=2)

    # Print some statistics
    total_schedules = sum(
        len(schedules)
        for building in data.values()
        for schedules in building['rooms'].values()
    )
    
    cleaned_schedules = sum(
        len(schedules)
        for building in cleaned_data.values()
        for schedules in building['rooms'].values()
    )
    
    print(f"Original number of schedules: {total_schedules}")
    print(f"Schedules after cleaning: {cleaned_schedules}")
    print(f"Removed {total_schedules - cleaned_schedules} non-weekly schedules")

if __name__ == "__main__":
    input_path = "output/grouped_by_building.json"
    output_path = "output/clean_without_weekly.json"
    clean_schedules(input_path, output_path)