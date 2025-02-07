# Scraper for UAlberta Course Catalogue

This will scrape classroom availability information.

## To run on Linux:

Build the image with: `sudo docker build -t classroom-scraper .`

Run the container with: `sudo docker run -v $(pwd):/app -e AUTH_COOKIE="your-value" classroom-scraper`

## To run on MacOS:

Build the image with: `docker build -t classroom-scraper .`

Run the container with: `docker run -v $(pwd):/app -e AUTH_COOKIE="your-auth-cookie-value" classroom-scraper`
