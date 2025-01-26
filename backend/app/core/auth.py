import logging
from datetime import datetime, timedelta
from uuid import UUID

from jose import jwt
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.routing import APIRouter
from fastapi import Request, Response, Depends
from fastapi.security import OAuth2PasswordBearer

from app.core.config import settings
from app.core.database import get_db, SessionLocal
from app.schemas.user import UserCreate, TokenResponse, PasswordReset
from app.crud.user import get_user_by_email
from app.utils.response import success_response, error_response
from app.models.user import User, Cookie
from app.utils.query import query

logging.getLogger("passlib").setLevel(logging.ERROR)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/user/signin")

async def validate_session_middleware(request: Request, call_next):
    access_token = request.cookies.get("access_token")
    path = request.url.path

    auth_required_paths = [
        "/private_health",
        "/user/update-password"
    ]

    if path in auth_required_paths:
        if not access_token:
            return error_response(401, False, "Unauthorized. Please log in.")

        db = SessionLocal()

        try:
            session = get_active_cookie(db, access_token=access_token)
            if session:
                request.state.user = session.user
                return await call_next(request)

            return error_response(401, False, "Unauthorized. Please log in.")
        finally:
            print("Closing DB connection")
            db.close()

    return await call_next(request)

def verify_password(plain_password, hashed_password):
    """
    Verify a plain text password against a hashed password.
    """
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    """
    Hash a plain text password.
    """
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: timedelta = None):
    """
    Create a new access token.
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now() + expires_delta
    else:
        expire = datetime.now() + timedelta(minutes=settings.access_token_expire_minutes)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
    return encoded_jwt

def create_user(
    db: Session,
    email: str,
    fname: str,
    lname: str,
    password: str,
    active: bool = True,
    share_profile: bool = True,
    education_level: str = None,
):
    """
    Create a new user and save it to the database.
    """
    hashed_password = get_password_hash(password)
    new_user = User(
        email=email,
        fname=fname,
        lname=lname,
        password=hashed_password,
        active=active,
        share_profile=share_profile,
        education_level=education_level,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

def create_cookie(db: Session, user_id: str, access_token: str, expires_at: datetime):
    """
    Create a new session.
    """
    session = Cookie(
        access_token=access_token,
        user_id=user_id,
        expires_at=expires_at,
        is_active=True
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session

def get_active_cookie(db: Session, access_token: str = None, user_id: UUID = None):
    """
    Retrieve an active session by session ID or user ID.
    """
    filters = [Cookie.is_active == True, Cookie.expires_at > datetime.now()]
    if access_token:
        filters.append(Cookie.access_token == access_token)
    if user_id:
        filters.append(Cookie.user_id == user_id)
    result = query(db, model=Cookie, filters=filters)
    return result[0] if result else None

def deactivate_cookie(db: Session, access_token: str):
    """
    Deactivate a session by session ID.
    """
    session = get_active_cookie(db, access_token=access_token)
    if session:
        session.is_active = False
        db.commit()
        db.refresh(session)
    return session

def get_active_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    """
    Get the currently authenticated user.
    """
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        email = payload.get("sub")
        if email is None:
            return error_response(401, False, "Invalid token")

        user = query(db, model=User, filters=[User.email == email])
        if not user:
            return error_response(401, False, "User not found")

        return user[0]
    except Exception as e:
        return error_response(401, False, {"error": str(e)})

@router.post("/signup")
def sign_up(user: UserCreate, db: Session = Depends(get_db)):
    """
    API endpoint to handle user sign-up.
    """
    try:
        existing_user = get_user_by_email(db, user.email)
        if existing_user:
            return error_response(
                status_codes=400,
                status=False,
                message="Email already registered."
            )

        new_user = create_user(
            db,
            email=user.email,
            fname=user.fname,
            lname=user.lname,
            password=user.password,
            active=user.active,
            share_profile=user.share_profile,
            education_level=user.education_level,
        )

        return success_response(
            status_codes=201,
            status=True,
            message="User successfully registered",
            data={"id": str(new_user.id), "email": new_user.email, "fname": new_user.fname, "lname": new_user.lname},
        )
    except Exception as e:
        return error_response(
            status_codes=500,
            status=False,
            message={"error": str(e)}
       )

@router.post("/signin", response_model=TokenResponse)
def sign_in(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
    response: Response = None
):
    """
    API endpoint to handle user sign-in.
    """
    user = get_user_by_email(db, form_data.username)
    if not user:
        return error_response(
            status_codes=400,
            status=False,
            message="Invalid email or password."
        )

    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )

    session_expiry = datetime.now() + access_token_expires
    create_cookie(db, user_id=user.id, access_token=access_token, expires_at=session_expiry)

    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        max_age=access_token_expires.total_seconds(),
    )

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }

@router.put("/update-password", tags=["auth-required"])
def update_password(
    password: PasswordReset,
    user: User = Depends(get_active_user),
    db: Session = Depends(get_db)
):
    """
    Update the user's password.
    """
    if not verify_password(password.old_password, user.password):
        return error_response(
            status_codes=400,
            status=False,
            message="Old password is incorrect."
        )

    user.password = get_password_hash(password.new_password)
    db.commit()
    return success_response(
        status_codes=200,
        status=True,
        message="Password updated successfully."
    )
