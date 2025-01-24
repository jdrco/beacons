from pydantic import BaseModel, EmailStr, Field

class UserUpdate(BaseModel):
    email: EmailStr
    lname: str = Field(..., min_length=2, max_length=50)
    fname: str = Field(..., min_length=2, max_length=50)
    status: str
    share_profile: bool
    education_level: str