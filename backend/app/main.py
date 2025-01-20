from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from sqlalchemy.orm import Session
from sqlalchemy.sql import text
from app.core.database import get_db
from app.core.config import settings
from app.routes.auth import router
from app.core.session import validate_session_middleware

app = FastAPI(
    title="Mash Beacons API",
    description="API for Mash Beacons application",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(
    SessionMiddleware,
    secret_key="test_key",
    session_cookie="session_id",
)

app.middleware("http")(validate_session_middleware)
app.include_router(router)

# @app.get("/health", tags=["Health"])
# def health_check(db: Session = Depends(get_db)):
#     """
#     Simple endpoint to test database connection.
#     """
#     try:
#         db.execute(text("SELECT 1"))
#         return {"status": "healthy", "message": "Database connection is working"}
#     except Exception as e:
#         return {"status": "unhealthy", "error": str(e)}