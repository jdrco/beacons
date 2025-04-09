# Beacons Web Application

This project consists of two main parts:
- **Frontend**: Built with React
- **Backend**: FastAPI application with a PostgreSQL database, managed using Docker

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
```

---

## Project Structure

```bash
beacons/
├── backend/
│   ├── app/
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── ...
└── web/
    ├── package.json
    ├── ...
```

---

## Running the Application

> 🛑 **Make sure you have the `.env` file placed inside `web/` and `backend/` before running these commands.**  
> It contains necessary configuration such as `DATABASE_URL`, `SECRET_KEY`, and email credentials.
> You can use the .env file example below

## 📦 .env File Example

Place this `.env` file inside the `web/` directory:

```env
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1IjoiamRyY28iLCJhIjoiY201eXl0Y3UyMGlwazJtbXgzNmgwbXN4bSJ9.agXYuQ1r9mqa-WpVPODitg
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Place this `.env` file inside the `backend/` directory:
```env
DATABASE_URL=postgresql://postgres:postgres@db:5432/postgres
SECRET_KEY=8f6aff488cc9f21d8676202403b0d4130b7139e81eb1c744fabcc208ebe452aa
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

MAIL_USERNAME=phamnamson175@gmail.com
MAIL_PASSWORD=gqzp zrbi iseo mkbh
MAIL_FROM=phamnamson175@gmail.com
```

---

### 🖥️ Terminal 1: Start the Frontend

```bash
cd beacons/web
npm install
npm run dev
```

- Starts the Vite development server for React.
- Open your browser to: [http://localhost:3000](http://localhost:3000)

---

### 🐳 Terminal 2: Start the Backend with Docker

```bash
cd beacons/backend
docker compose up --build
```

- Builds the Docker image
- Runs FastAPI and PostgreSQL containers
- Backend API is available at: [http://localhost:8000](http://localhost:8000)

---


---

## 🔍 Health Check Endpoints

Use these routes to verify the backend is working:

- **Public Check**: `GET http://localhost:8000/public_health`
- **Private Check** (requires auth): `GET http://localhost:8000/private_health`

---

## 🛠️ Troubleshooting Tips

- Ensure Docker and Node.js are correctly installed.
- Ensure `.env` exists and is correctly filled out.
- Make sure ports 3000 and 8000 are not blocked or in use.

---

## 📚 Credits

