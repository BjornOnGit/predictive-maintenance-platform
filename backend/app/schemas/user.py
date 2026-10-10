from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from uuid import UUID


class UserCreate(BaseModel):
    email: EmailStr
    password: str

class UserRegister(UserCreate):
    password: str = Field(min_length=8, max_length=128)

class UserRead(BaseModel):
    id: UUID
    email: str
    role: str

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str
