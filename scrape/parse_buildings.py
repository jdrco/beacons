import json

def group_by_building(data):
    grouped = {}
    
    for room, schedules in data.items():
        # Extract building acronym (everything before the first space)
        building = room.split(' ')[0]
        
        # Initialize dict for building if it doesn't exist
        if building not in grouped:
            grouped[building] = {}
            
        # Add the room data under the building
        grouped[building][room] = schedules
        
    return grouped

# Read the JSON file
with open('output/classroom_availability.json', 'r') as file:
    input_data = json.load(file)

# Group the data
grouped_data = group_by_building(input_data)

# Write the grouped data to a new JSON file
with open('output/grouped_by_building.json', 'w') as file:
    json.dump(grouped_data, file, indent=2)
