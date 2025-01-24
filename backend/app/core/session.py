from fastapi import Request
from fastapi.routing import APIRoute
from app.crud.user import get_active_session
from app.core.database import get_db
from app.utils.response import error_response

async def validate_session_middleware(request: Request, call_next):
    """
    Middleware to validate user session for routes tagged as 'auth-required'.
    """
    route: APIRoute = request.scope.get("route")

    if route and "auth-required" in route.tags:
        session_id = request.cookies.get("session_id")
        db = get_db()

        if session_id:
            session = get_active_session(db, session_id=session_id)
            if session:
                request.state.user = session.user
                return await call_next(request)

        return error_response(401, "Unauthorized, please login.")

    return await call_next(request)
