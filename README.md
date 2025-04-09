# Beacons Web Application

This project consists of two main parts:
- **Frontend**: Built with Vite + React
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

# Check PostgreSQL (if using local DB or psql CLI)
psql --version || echo "PostgreSQL is not installed. Get it from https://www.postgresql.org/download/"
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

> 🛑 **Make sure you have the `.env` file placed inside `backend/` before running these commands.**  
> It contains necessary configuration such as `DATABASE_URL`, `SECRET_KEY`, and email credentials.

---

### 🖥️ Terminal 1: Start the Frontend

```bash
cd beacons/web
npm install
npm run dev
```

- Starts the Vite development server for React.
- Open your browser to: [http://localhost:5173](http://localhost:5173)

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

## 📦 .env File Example

Place this `.env` file inside the `backend/` directory:

```env
DATABASE_URL=postgresql://postgres:postgres@db:5432/beacons
SECRET_KEY=your_secret_key_here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=180

MAIL_USERNAME=your_email@gmail.com
MAIL_PASSWORD=your_password
MAIL_FROM=your_email@gmail.com
MAIL_PORT=587
MAIL_SERVER=smtp.gmail.com
MAIL_STARTTLS=True
MAIL_SSL_TLS=False
```

> ⚠️ **Warning:** Never push your `.env` file to a public repository.  
> For academic submission, you may include it in your zipped folder if required.

---

## 🔍 Health Check Endpoints

Use these routes to verify the backend is working:

- **Public Check**: `GET http://localhost:8000/public_health`
- **Private Check** (requires auth): `GET http://localhost:8000/private_health`

---

## 🛠️ Troubleshooting Tips

- Ensure Docker and Node.js are correctly installed.
- Ensure `.env` exists and is correctly filled out.
- Make sure ports 5173 and 8000 are not blocked or in use.

---

## 📚 Credits

Developed as a capstone project by Nam Son.