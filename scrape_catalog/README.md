# Scraper for UAlberta Course Catalogue

This will scrape classroom availability information.

To run on Linux:

Build the image with: `sudo docker build -t classroom-scraper .`

Run the container with: `sudo docker run -e AUTH_COOKIE="your-auth-cookie-value" classroom-scraper`
