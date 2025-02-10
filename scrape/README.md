# Scraper for UAlberta Course Catalogue

This will scrape classroom availability information.

## To run on Linux:

Build the image with: `sudo docker build -t classroom-scraper .`

Run the container with: `sudo docker run -v $(pwd):/app -e AUTH_COOKIE="your-value" classroom-scraper`

## To run on MacOS:

Build the image with: `docker build -t classroom-scraper .`

Run the container with: `docker run -v $(pwd):/app -e AUTH_COOKIE="your-auth-cookie-value" classroom-scraper`

## To process data:

The classroom scraper will output to `output/raw_classroom_availability.json`.

There is a pre-made `building_cooridnates.txt` that has all it's coordinates from manually finding the building's long/lat from Google Maps.

Run `python3 process_classroom_availability.py` and it will output to `processed_classroom_availability.json`

## Other Notes

`parse_classrooms.py` is what's used to get all building names. `building_coordinates.txt` is built by running that script and then manually getting the long/lat from Google Maps into the scripts output text.