import logging
from datetime import datetime, timedelta
from uuid import UUID

from jose import jwt
from passlib.context import CryptContext
from fastapi import Response, Depends, Security
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.routing import APIRouter
from fastapi.security import OAuth2PasswordBearer
from fastapi.responses import RedirectResponse
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.schemas.user import UserCreate, TokenResponse, PasswordReset, EmailPasswordReset
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
    active: bool = False,
):
    hashed_password = get_password_hash(password)
    new_user = User(
        email=email,
        username=username,
        password=hashed_password,
        active=active,
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
async def sign_up(user: UserCreate, db: Session = Depends(get_db)):
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
        )

        verification_token = create_verification_token(new_user.email)
        await send_verification_email(new_user.email, verification_token)

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

        if not verify_password(form_data.password, user.password):
            return error_response(
                status_codes=400,
                status=False,
                message="Invalid email or password."
            )

        if not user.active:
            return error_response(
                status_codes=400,
                status=False,
                message="User is not active. Please verify your email."
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

def create_verification_token(
    email: str
):
    expire = datetime.now() + timedelta(minutes=30)
    payload = {"sub": email, "exp": expire}
    token = jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)
    return token

conf = ConnectionConfig(
    MAIL_USERNAME=settings.mail_username,
    MAIL_PASSWORD=settings.mail_password,
    MAIL_FROM=settings.mail_from,
    MAIL_PORT=settings.mail_port,
    MAIL_SERVER=settings.mail_server,
    MAIL_STARTTLS=settings.mail_starttls,
    MAIL_SSL_TLS=settings.mail_ssl_tls,
    USE_CREDENTIALS=True
)

async def send_verification_email(
    email: str,
    token: str
):
    verification_url = f"http://localhost:8000/verify-email?token={token}"
    message = MessageSchema(
        subject="Email Verification",
        recipients=[email],
        body=f"Click on the link to verify your email: {verification_url}",
        subtype="html"
    )
    fm = FastMail(conf)
    await fm.send_message(message)

@router.get("/verify-email")
def verify_email(
    token: str,
    db: Session = Depends(get_db)
):
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        email = payload.get("sub")

        if email is None:
            return error_response(
                status_codes=400,
                status=False,
                message="Invalid token."
            )

        user = get_user_by_email(db, email=email)
        if not user:
            return error_response(
                status_codes=404,
                status=False,
                message="User not found."
            )

        user.active = True
        db.commit()

        return RedirectResponse(url="") #TODO

    except Exception as e:
        return error_response(
            status_codes=500,
            status=False,
            message={"error": str(e)}
        )

@router.post("/resend-verification-email")
async def resend_verification_email(
    email: str,
    db: Session = Depends(get_db)
):
    user = get_user_by_email(db, email)
    if not user:
        return error_response(
            status_codes=404,
            status=False,
            message="User not found."
        )

    if user.active:
        return error_response(
            status_codes=400,
            status=False,
            message="User is already verified."
        )

    verification_token = create_verification_token(user.email)
    await send_verification_email(user.email, verification_token)

    return success_response(
        status_codes=200,
        status=True,
        message="Verification email resent successfully."
    )

@router.post("/request-password-reset")
async def request_password_reset(
    email: str,
    db: Session = Depends(get_db)
):
    user = get_user_by_email(db, email)

    if not user:
        return error_response(
            status_codes=404,
            status=False,
            message="User not found."
        )

    if not user.active:
        return error_response(
            status_codes=400,
            status=False,
            message="User is not verified."
        )

    reset_token = create_verification_token(user.email)
    await send_reset_password_email(user.email, reset_token)

    return success_response(
        status_codes=200,
        status=True,
        message="Password reset email sent successfully."
    )

async def send_reset_password_email(
    email: str,
    token: str
):
    reset_url = f"http://localhost:8000/user/reset-password?token={token}"
    message = MessageSchema(
        subject="Password Reset Request",
        recipients=[email],
        body=f"Click on the link to reset your password: {reset_url}",
        subtype="html"
    )
    fm = FastMail(conf)
    await fm.send_message(message)

@router.get("/verify-password-reset")
async def verify_password_reset(token: str, db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        email = payload.get("sub")

        if email is None:
            return error_response(
                status_codes=400,
                status=False,
                message="Invalid token."
            )

        user = get_user_by_email(db, email=email)
        if not user:
            return error_response(
                status_codes=404,
                status=False,
                message="User not found."
            )

        return RedirectResponse(url="") #TODO

    except jwt.ExpiredSignatureError:
        return error_response(
            status_codes=400,
            status=False,
            message="Token has expired."
        )
    except jwt.JWTError:
        return error_response(
            status_codes=400,
            status=False,
            message="Invalid token."
        )
    except Exception as e:
        return error_response(
            status_codes=500,
            status=False,
            message={"error": str(e)}
        )

@router.post("/reset-password")
async def reset_password(
    token: str,
    data: EmailPasswordReset,
    db: Session = Depends(get_db)
):
    if data.password != data.re_password:
        return error_response(
            status_codes=400,
            status=False,
            message="Passwords do not match."
        )

    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        email = payload.get("sub")

        if email is None:
            return error_response(
                status_codes=400,
                status=False,
                message="Invalid token."
            )

        user = get_user_by_email(db, email=email)
        if not user:
            return error_response(
                status_codes=404,
                status=False,
                message="User not found."
            )

        user.password = get_password_hash(data.password)
        db.commit()
        db.refresh(user)

        return success_response(
            status_codes=200,
            status=True,
            message="Password reset successfully."
        )
    except Exception as e:
        return error_response(
            status_codes=500,
            status=False,
            message=str(e)
        )
