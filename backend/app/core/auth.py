import random
import logging
import re
from datetime import datetime, timedelta
from uuid import UUID
from typing import Optional

from jose import jwt
from passlib.context import CryptContext
from fastapi import Response, Depends, Security, HTTPException, status
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
from app.models.user import User, Program, Cookie
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
    program_id: UUID = None
):
    hashed_password = get_password_hash(password)
    new_user = User(
        email=email,
        username=username,
        password=hashed_password,
        active=active,
        program_id=program_id,
        created_at=datetime.now()
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
        user_id: UUID = None
):
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
    """
    4.2 User Sign-In
    REQ-6: The system shall maintain the user's authentication state across sessions until explicit logout.
    REQ-7: The system shall redirect unauthenticated users to the login page when attempting to access protected features.
    """
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized: Please provide a valid token")

    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        email = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

        user = filter_query(db, model=User, filters=[User.email == email])
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

        return user[0]
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))

@router.post("/signup")
async def sign_up(
    user: UserCreate,
    db: Session = Depends(get_db)
):
    """
    4.1 User Registration
    REQ-1: The system shall provide user registration via email and password.
    REQ-2: The system shall verify that the provided email address is valid.
    REQ-3: The system shall enforce password security requirements (minimum length, complexity).
    REQ-4: The system shall store valid user information in the database after successful registration (Email, Password hash, Registration timestamp).
    REQ-5: The system shall generate a random appropriate unique username (display name) for the user after successful registration.
    REQ-6: The system shall display appropriate error messages for invalid email format, password requirements, or existing email.
    REQ-7: The system shall send an email verification link upon successful registration
    """
    try:
        if not user.email.endswith("@ualberta.ca"):
            return error_response(400, False, "Only @ualberta.ca emails are allowed.")

        if not re.search(r"[A-Z]", user.password):
            return error_response(400, False, "Password must contain at least one uppercase letter.")

        if not re.search(r"[0-9]", user.password):
            return error_response(400, False, "Password must contain at least one number.")

        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", user.password):
            return error_response(400, False, "Password must contain at least one special character.")

        if user.password != user.re_password:
            return error_response(400, False, "Passwords do not match.")

        existing_email = get_user_by_email(db, user.email)
        if existing_email:
            return error_response(
                status_codes=400,
                status=False,
                message="Email already registered."
            )

        while True:
            random_username = f"student_{random.randint(0, 99999)}"
            existing_username = get_user_by_username(db, random_username)
            if not existing_username:
                break

        program_id = None
        if user.program:
            programs = filter_query(db, model=Program, filters=[Program.name == user.program])
            if programs:
                program_id = programs[0].id
            else:
                return error_response(
                    status_codes=400,
                    status=False,
                    message="Program not found."
                )

        new_user = create_user(
            db,
            email=user.email,
            username=random_username,
            password=user.password,
            active=False,
            program_id=program_id
        )

        verification_token = create_verification_token(new_user.email)
        await send_verification_email(new_user.email, verification_token)

        return success_response(
            status_codes=201,
            status=True,
            message="User successfully registered",
            data={
                "id": str(new_user.id), 
                "email": new_user.email, 
                "username": random_username, 
                "program": user.program,
            }
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
    4.2 User Sign-In
    REQ-1: The system shall provide user authentication via email and password.
    REQ-2: The system shall verify user credentials against stored information in the database.
    REQ-3: The system shall securely manage user sessions after successful authentication.
    REQ-5: The system shall display appropriate error messages for invalid credentials.
    """
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
    """
    4.2 User Sign-In
    REQ-4: The system shall provide the option to log out of the system.
    """
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
    """
    4.2 User Sign-In
    REQ-8: The system shall provide a secure password reset functionality.
    """
    try:
        if not verify_password(password.old_password, current_user.password):
            return error_response(400, False, "Old password is incorrect.")

        if not re.search(r"[A-Z]", password.new_password):
            return error_response(400, False, "Password must contain at least one uppercase letter.")

        if not re.search(r"[0-9]", password.new_password):
            return error_response(400, False, "Password must contain at least one number.")

        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password.new_password):
            return error_response(400, False, "Password must contain at least one special character.")

        if password.new_password != password.re_password:
            return error_response(400, False, "Passwords do not match.")

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
    verification_url = f"{settings.backend_url}/verify-email?token={token}"
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
            # Redirect to frontend with error message
            return RedirectResponse(url=f"{settings.frontend_url}/resend-verification-email?error=invalid_token")

        user = get_user_by_email(db, email=email)
        if not user:
            # Redirect to frontend with error message
            return RedirectResponse(url=f"{settings.frontend_url}/resend-verification-email?error=user_not_found")

        user.active = True
        db.commit()

        return RedirectResponse(url=f"{settings.frontend_url}/signin")

    except Exception as e:
        # Redirect to frontend with general error
        return RedirectResponse(url=f"{settings.frontend_url}/resend-verification-email?error=verification_failed")

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
    """
    4.2 User Sign-In
    REQ-9: The system shall allow users to request a password reset by submitting their registered email.
    """
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
    """
    4.2 User Sign-In
    REQ-10: The system shall send an email containing a password reset link upon request.
    """
    reset_url = f"{settings.frontend_url}/reset-password?token={token}"
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
    """
    4.2 User Sign-In
    REQ-11: The system shall verify and allow users to reset their password upon clicking the password reset link.
    REQ-12: The system shall display an appropriate error message for invalid or expired password reset links.
    """
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

        return RedirectResponse(url=f"{settings.frontend_url}/signin")

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
    """
    4.2 User Sign-In
    REQ-9: The system shall allow users to request a password reset by submitting their registered email.
    """
    try:
        if not re.search(r"[A-Z]", data.password):
            return error_response(400, False, "Password must contain at least one uppercase letter.")

        if not re.search(r"[0-9]", data.password):
            return error_response(400, False, "Password must contain at least one number.")

        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", data.password):
            return error_response(400, False, "Password must contain at least one special character.")

        if data.password != data.re_password:
            return error_response(400, False, "Passwords do not match.")

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

@router.get("/list_programs")
def list_programs(
    keyword: Optional[str] = None,
    faculty: Optional[str] = None,
    is_undergrad: Optional[bool] = None,
    page: int = 1,
    per_page: int = 10,
    db: Session = Depends(get_db)
):
    try:
        filters = []

        if faculty:
            filters.append(Program.faculty.ilike(f"%{faculty}%"))

        if keyword:
            filters.append(Program.name.ilike(f"%{keyword}%"))

        if is_undergrad is not None:
            filters.append(Program.is_undergrad == is_undergrad)

        total_count = db.query(Program).filter(*filters).count()

        programs = filter_query(
            db,
            model=Program,
            filters=filters,
            limit=per_page,
            offset=(page - 1) * per_page
        )

        program_data = [{
            "id": str(program.id),
            "name": program.name,
            "is_undergrad": program.is_undergrad,
            "faculty": program.faculty
        } for program in programs]

        pagination = {
            "total": total_count,
            "page": page,
            "per_page": per_page,
            "total_pages": (total_count + per_page - 1) // per_page
        }

        return success_response(
            200,
            True,
            "Programs retrieved successfully",
            data=program_data,
            pagination=pagination
        )

    except Exception as e:
        return error_response(
            500,
            False,
            str(e)
        )