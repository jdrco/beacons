from pydantic import BaseModel, EmailStr, Field

class UserSignUp(BaseModel):
    email: EmailStr
    lname: str = Field(..., min_length=2, max_length=50)
    fname: str = Field(..., min_length=2, max_length=50)
    status: str
    program: str
    share_profile: bool = False