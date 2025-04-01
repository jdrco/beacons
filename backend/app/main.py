from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware

from app.core.auth import get_active_user, router as auth_router
from app.routes.user import router as user_router
from app.utils.response import success_response, error_response
from app.models.user import User

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

# app.middleware("http")(validate_session_middleware)
app.include_router(auth_router, tags=["auth"])
app.include_router(user_router, tags=["user"])


@app.get("/public_health", tags=["health"])
async def public_health_check():
    return success_response(200, True, "Public health check.")

@app.get("/private_health", tags=["health"])
async def private_health_check(
    current_user: User = Depends(get_active_user)):
    print("testing")
    if not current_user:
        return error_response(401, False, "Unauthorized. Please log in.")
    return success_response(200, True, "Private health check.")
