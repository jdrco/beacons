import re
from typing import Optional
from pydantic import BaseModel, EmailStr, field_validator
from fastapi import HTTPException
from app.utils.response import error_response

class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str
    re_password: str
    program: Optional[str] = None

    @field_validator("email", "username", mode="before")
    @classmethod
    def trim_spaces(cls, value: str):
        if isinstance(value, str):
            return value.strip()
        return value

    @field_validator("email", mode="before")
    @classmethod
    def validate_email_domain(cls, email: str):
        email = email.strip()
        if not email.endswith("@ualberta.ca"):
            raise ValueError("Only @ualberta.ca emails are allowed.")
        return email

    @field_validator("password", mode="after")
    @classmethod
    def validate_password_strength(cls, password):
        if not re.search(r"[A-Z]", password):
            raise HTTPException(
                status_code=400,
                detail="Password must contain at least one uppercase letter."
            )
        if not re.search(r"[0-9]", password):
            raise HTTPException(
                status_code=400,
                detail="Password must contain at least one number."
            )
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
            raise HTTPException(
                status_code=400,
                detail="Password must contain at least one special character."
            )
        return password

    @field_validator("re_password", mode="after")
    @classmethod
    def passwords_match(cls, re_password, values):
        if "password" in values and re_password != values["password"]:
            raise HTTPException(
                status_code=400,
                detail="Passwords do not match."
            )
        return re_password

class TokenResponse(BaseModel):
    access_token: str
    token_type: str

class PasswordReset(BaseModel):
    old_password: str
    new_password: str
    re_password: str

    @field_validator("new_password", mode="after")
    @classmethod
    def validate_password_strength(cls, new_password):
        if not re.search(r"[A-Z]", new_password):
            raise HTTPException(
                status_code=400,
                detail="Password must contain at least one uppercase letter."
            )
        if not re.search(r"[0-9]", new_password):
            raise HTTPException(
                status_code=400,
                detail="Password must contain at least one number."
            )
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", new_password):
            raise HTTPException(
                status_code=400,
                detail="Password must contain at least one special character."
            )
        return new_password

    @field_validator("re_password", mode="after")
    @classmethod
    def passwords_match(cls, re_password, values):
        if "new_password" in values and re_password != values["new_password"]:
            raise HTTPException(
                status_code=400,
                detail="Passwords do not match."
            )
        return re_password

class UserUpdate(BaseModel):
    user_id: str
    username: Optional[str] = None
    active: Optional[bool] = None

    @field_validator("username", mode="before")
    @classmethod
    def trim_spaces(cls, value: str):
        if isinstance(value, str):
            return value.strip()
        return value

class EmailPasswordReset(BaseModel):
    password: str
    re_password: str

    @field_validator("password", mode="after")
    @classmethod
    def validate_password_strength(cls, password):
        if not re.search(r"[A-Z]", password):
            raise HTTPException(
                status_code=400,
                detail="Password must contain at least one uppercase letter."
            )
        if not re.search(r"[0-9]", password):
            raise HTTPException(
                status_code=400,
                detail="Password must contain at least one number."
            )
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
            raise HTTPException(
                status_code=400,
                detail="Password must contain at least one special character."
            )
        return password

    @field_validator("re_password", mode="after")
    @classmethod
    def passwords_match(cls, re_password, values):
        if "password" in values and re_password != values["password"]:
            raise HTTPException(
                status_code=400,
                detail="Passwords do not match."
            )
        return re_password
