from fastapi import APIRouter, Request, Depends
from authlib.integrations.starlette_client import OAuth, OAuthError
from app.core.config import settings
from app.core.database import get_db
from app.crud.user import get_user_by_email, create_user, create_session, get_active_session
from app.utils.response import success_response, error_response

# oauth = OAuth()
# oauth.register(
#     name="google",
#     client_id=settings.google_client_id,
#     client_secret=settings.google_client_secret,
#     server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
#     client_kwargs={
#         "scope": "openid email profile",
#         "redirect_uri": settings.google_redirect_uri,
#     },
# )

# router = APIRouter()

# @router.get("/auth/login", tags=["public"])
# async def login(request: Request):
#     return await oauth.google.authorize_redirect(request, settings.google_redirect_uri)

# @router.get("/auth/callback", tags=["public"])
# async def callback(request: Request, db=Depends(get_db)):
#     try:
#         token = await oauth.google.authorize_access_token(request)
#         user = token.get("userinfo")
#         email = user.get("email")
#         if not email or user.get("hd") != "ualberta.ca":
#             return error_response(
#                 status_codes=400,
#                 status=False,
#                 message="You must use a ualberta.ca email address to login"
#             )

#         existing_user = get_user_by_email(db, email)
#         if existing_user:
#             active_session = get_active_session(db, user_id=existing_user.id)
#             if active_session:
#                 response = success_response(
#                     status_codes=200,
#                     status=True,
#                     message="User logged in successfully",
#                     data={
#                         "user": {
#                             "email": existing_user.email,
#                             "fname": existing_user.fname,
#                             "lname": existing_user.lname,
#                         }
#                     },
#                 )
#                 response.set_cookie(
#                     key="session_id",
#                     value=active_session.id,
#                     max_age=86400
#                 )
#                 return response
            
#             session = create_session(db, user_id=existing_user.id)
#             response = success_response(
#                 status_codes=200,
#                 status=True,
#                 message="User logged in successfully",
#                 data={
#                     "user": {
#                         "email": existing_user.email,
#                         "fname": existing_user.fname,
#                         "lname": existing_user.lname,
#                     }
#                 },
#             )
#             response.set_cookie(
#                 key="session_id",
#                 value=session.id,
#                 max_age=86400,
#             )
#             return response
        
#         fname = user.get("given_name", "")
#         lname = user.get("family_name", "")

#         new_user = create_user(db, email=email, fname=fname, lname=lname)
#         session = create_session(db, user_id=new_user.id)

#         response = success_response(
#             status_codes=201,
#             status=True,
#             message="User created successfully",
#             data={
#                 "user": {
#                     "email": new_user.email,
#                     "fname": new_user.fname,
#                     "lname": new_user.lname,
#                 }
#             },
#         )
#         response.set_cookie(
#             key="session_id",
#             value=session.id,
#             max_age=86400
#         )
#         return response
#     except OAuthError as e:
#         return error_response(
#             status_codes=401,
#             status=False,
#             message="Authentication failed, invalid token"
#         )
#     except Exception as e:
#         return error_response(
#             status_codes=500,
#             status=False,
#             message={"error": str(e)}
#         )
