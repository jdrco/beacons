from fastapi import FastAPI, Request, Depends
from fastapi.middleware.cors import CORSMiddleware

from app.core.auth import validate_session_middleware, router
from app.utils.response import success_response, error_response

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

app.middleware("http")(validate_session_middleware)
app.include_router(router, prefix="/user", tags=["user"])

@app.get("/public_health", tags=["public"])
async def public_health_check():
    """
    Public health check, accessible without authentication.
    """
    return success_response(200, True, "Public health check.")

@app.get("/private_health", tags=["auth-required"])
async def private_health_check(
    request: Request):
    """
    Private health check, requires a valid session.
    """
    print("testing")
    if not hasattr(request.state, "user"):
        return error_response(401, False, "Unauthorized. Please log in.")
    return success_response(200, True, "Private health check.")
