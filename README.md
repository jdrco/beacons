# Beacons Web Application

This project consists of three main parts:
- **Frontend**: Built with React and Next.js
- **Backend**: FastAPI application with a PostgreSQL database, managed using Docker
- **Scraper**: A web scraper to collect classroom information

---

## Prerequisites

Make sure the following tools are installed:

### ✅ Check If Installed

Run these commands in your terminal:

```bash
# Check Node.js
node -v || echo "Node.js is not installed. Please install it from https://nodejs.org/"

# Check npm
npm -v || echo "npm is not installed. Please install Node.js from https://nodejs.org/"

# Check Docker
docker -v || echo "Docker is not installed. Please install it from https://www.docker.com/"

# Check Docker Compose
docker compose version || echo "Docker Compose is not installed. Please install it with Docker Desktop."

# Check Python
python3 --version || echo "Python 3 is not installed. Please install it from https://www.python.org/downloads/"
```

---

## Project Structure

```bash
beacons/
├── backend/
│   └── ...
├── web/
│   └── ...
└── scraper/
    ├── output/
    ├── process_classroom_availability.py
    └── ...
```

---

## Running the Application

> 🛑 **Make sure you have the `.env` file placed inside both `web/` and `backend/` directories before running these commands.**  
> It contains necessary configuration such as `DATABASE_URL`, `SECRET_KEY`, email credentials, and API URLs.

---

## 📦 .env File Example

### Place this `.env` file inside the `web/` directory:

```env
NEXT_PUBLIC_MAPBOX_TOKEN=<your_mapbox_public_token>
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Place this `.env` file inside the `backend/` directory:

```env
DATABASE_URL=<your_postgress_database_url>
SECRET_KEY=<your_secret_key>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

MAIL_USERNAME=phamnamson175@gmail.com
MAIL_PASSWORD=<your_mail_password>
MAIL_FROM=phamnamson175@gmail.com
```

## Data Prerequisite

### Frontend: Make sure you have the classroom data

If not there already, you need to place the `processed_classroom_availability.json` in  `web/public/`.

See instructions on how to collect this data in the scraper section of this setup guide.

### Backend: Make sure you have the classroom data

If not there already, you need to place the `processed_classroom_availability.json` in  `backend/room_program_data/`.

See instructions on how to collect this data in the scraper section of this setup guide.

---

## 🚀 How to Run

### 🖥️ Terminal 1: Start the Frontend (Next.js)

```bash
cd beacons/web
npm install
npm run dev
```

- Starts the Next.js development server.
- Open your browser to: [http://localhost:3000](http://localhost:3000)

---

### 🐳 Terminal 2: Start the Backend with Docker

```bash
cd beacons/backend
docker compose up --build
```

You may need to run with `sudo` on Linux systems

- Builds and starts the FastAPI + PostgreSQL containers.
- Backend API will be live at: [http://localhost:8000](http://localhost:8000)

---

## 🕷️ Scraper: Classroom Availability (Optional)

This project includes a web scraper that collects classroom availability information from the University of Alberta course catalogue.

We've already included the processed_classroom_availability.json so it's optional to run this.

### 🔧 Running on Linux

```bash
# Build the Docker image
sudo docker build -t classroom-scraper .

# Run the container with your auth cookie
sudo docker run -v $(pwd):/app -e AUTH_COOKIE="your-auth-cookie-value" classroom-scraper
```

### 🍎 Running on macOS

```bash
# Build the Docker image
docker build -t classroom-scraper .

# Run the container with your auth cookie
docker run -v $(pwd):/app -e AUTH_COOKIE="your-auth-cookie-value" classroom-scraper
```

### 📊 Processing the Scraped Data

The scraper outputs raw data to:

```bash
output/raw_classroom_availability.json
```

To process it into a cleaner format:

```bash
python3 process_classroom_availability.py
```

Result will be saved to:

```bash
processed_classroom_availability.json
```

### 🌐 Notes

- Building coordinates are fetched through: `https://www.ualberta.ca/api/maps/` or just manually collected with Google Maps.
- Ensure your `AUTH_COOKIE` is valid to access data.

---

## 🔍 Health Check Endpoints

Use these routes to verify the backend is working:

- **Public Check**: `GET http://localhost:8000/public_health`
- **Private Check** (requires authentication): `GET http://localhost:8000/private_health`

---

## 🛠️ Troubleshooting Tips

- Ensure Docker, Docker Compose, and Node.js are correctly installed.
- Confirm both `.env` files are present and contain the correct information.
- Make sure no other apps are using ports `3000` or `8000`.

---

## 📚 Credits

ECE 493 Instructors and TAs of Winter 2025 at University of Alberta

ECE 493 Group 14:
- Jared Drueco
- Pham Nam Son
- Bassam Dakhel