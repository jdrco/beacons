import json
import re


def count_top_level_keys(filename):
    try:
        with open(filename, "r") as file:
            data = json.load(file)
            count = len(data.keys())
            print(f"Number of top-level keys: {count}")

            print("\nTop-level keys:")
            for key in data.keys():
                print(f"- {key}")

    except FileNotFoundError:
        print(f"Error: File '{filename}' not found")
    except json.JSONDecodeError:
        print("Error: Invalid JSON format")


def check_duplicate_keys(filename):
    try:
        # Read the file as text to find all keys
        with open(filename, "r") as file:
            content = file.read()

        # Use regex to find all top-level keys
        # This matches keys with 0-2 spaces indentation
        pattern = r'^[ ]{0,2}"([^"]+)": [\[\{]?$'
        keys = re.findall(pattern, content, re.MULTILINE)

        # Check for duplicates
        seen = {}
        duplicates = []

        for key in keys:
            if key in seen:
                seen[key] += 1
                if (
                    seen[key] == 2
                ):  # Only add to duplicates list the first time we see a duplicate
                    duplicates.append(key)
            else:
                seen[key] = 1

        # Report findings
        if duplicates:
            print("\nFound duplicate keys:")
            for key in duplicates:
                print(f"- '{key}' appears {seen[key]} times")
        else:
            print("\nNo duplicate keys found")

        return duplicates

    except FileNotFoundError:
        print(f"Error: File '{filename}' not found")
        return []


def process_json(filename):
    print("=== Counting Keys ===")
    count_top_level_keys(filename)

    print("\n=== Checking for Duplicates ===")
    check_duplicate_keys(filename)


# Run the processor
if __name__ == "__main__":
    process_json("output/classroom_availability.json")

