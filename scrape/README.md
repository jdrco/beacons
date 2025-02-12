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

Run `python3 process_classroom_availability.py` and it will output to `processed_classroom_availability.json`

## Other Notes

Building coordinates are fetched through `https://www.ualberta.ca/api/maps/`.