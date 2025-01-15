# from fastapi import FastAPI, Depends, HTTPException
# from sqlalchemy.orm import Session
# from . import models
# from .db import engine, get_db
# from pydantic import BaseModel
# from fastapi.middleware.cors import CORSMiddleware
# import os
# from dotenv import load_dotenv

# load_dotenv()

# # Get environment variables with defaults
# CORS_ORIGINS = os.getenv(
#     "CORS_ORIGINS", 
#     "http://localhost:3000"
# ).split(",")

# models.Base.metadata.create_all(bind=engine)

# app = FastAPI()

# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=CORS_ORIGINS,
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )


from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy.sql import text
from app.core.database import get_db

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