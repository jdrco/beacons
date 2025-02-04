import re
from typing import Literal
from pydantic import BaseModel, EmailStr, Field, field_validator
from app.utils.response import error_response

class UserCreate(BaseModel):
    """
    Pydantic model for user sign-up.
    """
    email: EmailStr
    username: str
    password: str
    re_password: str
    active: bool = True
    share_profile: bool = True
    education_level: Literal["Undergraduate", "Graduate"] = None

    @field_validator("email", "username", mode="before")
    @classmethod
    def trim_spaces(cls, value: str):
        if isinstance(value, str):
            return value.strip()
        return value

    @field_validator("password", mode="after")
    @classmethod
    def validate_password_strength(cls, password):
        """
        Validate that the password contains at least:
        """
        if not re.search(r"[A-Z]", password):
            return error_response(
                status_codes=400,
                status=False,
                message="Password must contain at least one uppercase letter."
            )
        if not re.search(r"[0-9]", password):
            return error_response(
                status_codes=400,
                status=False,
                message="Password must contain at least one number."
            )
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
            return error_response(
                status_codes=400,
                status=False,
                message="Password must contain at least one special character."
            )
        return password

    @field_validator("re_password", mode="after")
    @classmethod
    def passwords_match(cls, re_password, values):
        """
        Validate that the re-entered password matches the original password.
        """
        if "password" in values.data and re_password != values.data["password"]:
            return error_response(
                status_codes=400,
                status=False,
                message="Passwords do not match."
            )
        return re_password

class TokenResponse(BaseModel):
    """
    Pydantic model for the token response.
    """
    access_token: str
    token_type: str

class PasswordReset(BaseModel):
    """
    Pydantic model for password reset.
    """
    old_password: str
    new_password: str
    re_password: str

    @field_validator("new_password", mode="after")
    @classmethod
    def validate_password_strength(cls, new_password):
        """
        Validate that the password contains at least:
        """
        if not re.search(r"[A-Z]", new_password):
            return error_response(
                status_codes=400,
                status=False,
                message="Password must contain at least one uppercase letter."
            )
        if not re.search(r"[0-9]", new_password):
            return error_response(
                status_codes=400,
                status=False,
                message="Password must contain at least one number."
            )
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", new_password):
            return error_response(
                status_codes=400,
                status=False,
                message="Password must contain at least one special character."
            )
        return new_password
    
    @field_validator("re_password", mode="after")
    @classmethod
    def passwords_match(cls, re_password, values):
        """
        Validate that the re-entered password matches the original password.
        """
        if "new_password" in values.data and re_password != values.data["new_password"]:
            return error_response(
                status_codes=400,
                status=False,
                message="Passwords do not match."
            )
        return re_password
