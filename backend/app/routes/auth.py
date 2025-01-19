from fastapi import APIRouter, Request, Depends
from starlette.responses import RedirectResponse
from authlib.integrations.starlette_client import OAuth
from app.core.config import settings

oauth = OAuth()
oauth.register(
    name="google",
    client_id=settings.google_client_id,
    client_secret=settings.google_client_secret,
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={
        "scope": "openid email profile",
        "redirect_uri": settings.google_redirect_uri,
    },
)

router = APIRouter()

@router.get("/auth/login")
async def login(request: Request):
    response = await oauth.google.authorize_redirect(request, settings.google_redirect_uri)
    print(f"Session After Login: {request.session}")
    return response


@router.get("/auth/callback")
async def callback(request: Request):
    print(f"Query Parameters: {request.query_params}")
    print(f"Session Data: {request.session}")
    print(f"Cookies: {request.cookies}")
    
    # Log the specific parameters
    state_in_query = request.query_params.get("state")
    print(f"State in Query: {state_in_query}")
    state_in_session = request.session.get("state")
    print(f"State in Session: {state_in_session}")
    
    try:
        token = await oauth.google.authorize_access_token(request)
        user = token.get("userinfo")
        print(f"User Info: {user}")
        return {"message": "Login successful", "user": user}
    except Exception as e:
        print(f"Error: {str(e)}")
        return {"error": str(e)}

    
    # token = await oauth.google.authorize_access_token(request)
    # user_info = token.get("userinfo")
    # if user_info and user_info["email"].endswith("@ualberta.ca"):
    #     # Fetch or create a user in the database
    #     return {"message": "Login successful", "user": user_info}
    # return {"error": "Unauthorized email domain"}