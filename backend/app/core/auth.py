import logging
from datetime import datetime, timedelta
from uuid import UUID

from fastapi import Response, Depends, Security
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.routing import APIRouter
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jose import jwt
from passlib.context import CryptContext

from app.core.config import settings
from app.core.database import get_db
from app.schemas.user import UserCreate, TokenResponse, PasswordReset
from app.crud.user import get_user_by_email, get_user_by_username
from app.utils.response import success_response, error_response
from app.models.user import User, Cookie
from app.utils.query import filter_query

logging.getLogger("passlib").setLevel(logging.ERROR)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/signin", auto_error=False)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: timedelta = None):
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
    username: str,
    password: str,
    active: bool = True,
    share_profile: bool = True,
    education_level: str = None,
):
    hashed_password = get_password_hash(password)
    new_user = User(
        email=email,
        username=username,
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

def get_active_cookie(
        db: Session,
        access_token: str = None,
        user_id: UUID = None):
    filters = [Cookie.is_active == True, Cookie.expires_at > datetime.now()]
    if access_token:
        filters.append(Cookie.access_token == access_token)
    if user_id:
        filters.append(Cookie.user_id == user_id)
    result = filter_query(db, model=Cookie, filters=filters)
    return result[0] if result else None

def deactivate_cookie(db: Session, access_token: str):
    session = get_active_cookie(db, access_token=access_token)
    if session:
        session.is_active = False
        db.commit()
        db.refresh(session)
    return session

def get_active_user(
    token: str = Security(oauth2_scheme),
    db: Session = Depends(get_db)
):
    if not token:
        return error_response(401, False, "Unauthorized: Please provide a valid token")

    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        email = payload.get("sub")
        if email is None:
            return error_response(401, False, "Invalid token")

        user = filter_query(db, model=User, filters=[User.email == email])
        if not user:
            return error_response(401, False, "User not found")

        return user[0]
    except Exception as e:
        return error_response(401, False, {"error": str(e)})

@router.post("/signup")
def sign_up(user: UserCreate, db: Session = Depends(get_db)):
    try:
        existing_email = get_user_by_email(db, user.email)
        if existing_email:
            return error_response(
                status_codes=400,
                status=False,
                message="Email already registered."
            )

        existing_username = get_user_by_username(db, user.username)
        if existing_username:
            return error_response(
                status_codes=400,
                status=False,
                message="Username already taken."
            )

        new_user = create_user(
            db,
            email=user.email,
            username=user.username,
            password=user.password,
            active=False,
            share_profile=user.share_profile,
            education_level=user.education_level,
        )

        return success_response(
            status_codes=201,
            status=True,
            message="User successfully registered",
            data={"id": str(new_user.id), "email": new_user.email, "username": new_user.username}
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
    try:
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
    except Exception as e:
        return error_response(
            status_codes=500,
            status=False,
            message={"error": str(e)}
        )

@router.post("/signout")
def sign_out(
    current_user: User = Depends(get_active_user),
    db: Session = Depends(get_db),
    response: Response = None
):
    try:
        active_cookie = get_active_cookie(db, user_id=current_user.id)
        if active_cookie:
            deactivate_cookie(db, active_cookie.access_token)
            response.delete_cookie("access_token")
            return success_response(
                status_codes=200,
                status=True,
                message="User signed out successfully."
            )

        return error_response(
            status_codes=400,
            status=False,
            message="No active session found."
        )
    except Exception as e:
        return error_response(
            status_codes=500,
            status=False,
            message={"error": str(e)}
        )

@router.put("/update-password")
def update_password(
    password: PasswordReset,
    current_user: User = Depends(get_active_user),
    db: Session = Depends(get_db)
):
    try:
        if not verify_password(password.old_password, current_user.password):
            return error_response(
                status_codes=400,
                status=False,
                message="Old password is incorrect."
            )

        current_user.password = get_password_hash(password.new_password)
        db.add(current_user)
        db.commit()
        db.refresh(current_user)
        return success_response(
            status_codes=200,
            status=True,
            message="Password updated successfully."
        )

    except Exception as e:
        return error_response(
            status_codes=500,
            status=False,
            message={"error": str(e)}
        )
