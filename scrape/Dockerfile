# Use Node.js LTS (Long Term Support) as base image
FROM node:20-slim

# Install Firefox and dependencies
RUN apt-get update && apt-get install -y \
    firefox-esr \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libgdk-pixbuf2.0-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libxss1 \
    libxtst6 \
    xdg-utils \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies and Playwright Firefox
RUN npm install && \
    npx playwright install firefox

# Copy source code
COPY . .

# Set the authentication cookie as a build argument
ARG AUTH_COOKIE
ENV AUTH_COOKIE=$AUTH_COOKIE

# Run the script
CMD ["node", "scraper.js"]
