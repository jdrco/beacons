from fastapi import FastAPI, Depends, HTTPException, Cookie
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from sqlalchemy.orm import Session
from sqlalchemy.sql import text
from app.core.database import get_db
from app.core.config import settings
from app.routes.auth import router
from app.core.session import validate_session_middleware
from app.crud.user import get_active_session

app = FastAPI(
    title="Beacons API",
    description="API for Beacons application",
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

async def validate_session(
    session_id: str = Cookie(None),
    db: Session = Depends(get_db)
):
    if not session_id:
        raise HTTPException(status_code=401, detail="Session ID is missing.")
    session = get_active_session(db, session_id=session_id)
    if not session:
        raise HTTPException(status_code=401, detail="Invalid or expired session.")
    return session.user

# Define private and public routes
@app.get("/private_health", tags=["auth-required"])
async def private_health_check(user=Depends(validate_session)):
    return {"status": "ok", "user": user.username}

@app.get("/public_health", tags=["public"])
async def public_health_check():
    return {"status": "ok"}
