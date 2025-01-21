# Scraper for UAlberta Course Catalogue

This will scrape classroom availability information.

To run on Linux:

`sudo docker build -t classroom-scraper .`
`sudo docker run -e AUTH_COOKIE="your-auth-cookie-value" classroom-scraper`
