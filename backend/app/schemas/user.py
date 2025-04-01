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

class TokenResponse(BaseModel):
    access_token: str
    token_type: str

class PasswordReset(BaseModel):
    old_password: str
    new_password: str
    re_password: str

class UserUpdate(BaseModel):
    username: Optional[str] = None
    program: Optional[str] = None

    @field_validator("username", "program", mode="before")
    @classmethod
    def trim_spaces(cls, value: str):
        if isinstance(value, str):
            return value.strip()
        return value

class EmailPasswordReset(BaseModel):
    password: str
    re_password: str
