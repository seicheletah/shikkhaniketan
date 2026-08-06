from sqlmodel import Field, SQLModel, func, Column, DateTime, Integer, ForeignKey
from pydantic import EmailStr, model_validator
from datetime import datetime, date
from enum import Enum


# access token generation model
class Token(SQLModel):
    access_token: str
    token_type: str


# token data valdation model
class TokenData(SQLModel):
    id: int | None = None
    email_id: str | None = None
    role: str | None = None


# for user role selection pydantic validation
class UserRole(str, Enum):
    admin = "admin"
    teacher = "teacher"
    student = "student"


# user base model
class UserBase(SQLModel):
    email_id: EmailStr
    role: UserRole


# user table model
class User(UserBase, table=True):
    email_id: EmailStr = Field(unique=True)
    id: int | None = Field(default=None, primary_key=True)
    created_at: datetime | None = Field(
        default=None,
        sa_column=Column(
            DateTime(timezone=True), nullable=False, server_default=func.now()
        ),
    )
    hashed_password: str


# create user model with pydantic vlidation
class UserCreate(UserBase):
    hashed_password: str

    # custom pydantic model validation
    @model_validator(mode="after")
    def check_role(self):
        if self.role == UserRole.admin:
            raise ValueError("access denied")
        return self


# update user model with pydantic vlidation
class UserUpdate(SQLModel):
    email_id: EmailStr | None = None
    hashed_password: str | None = None


# user response model for response body
class UserResponse(UserBase):
    id: int


# for checking request data validation with pydantic
class UserLogin(UserCreate):
    pass


# student base model
class StudentBase(SQLModel):
    first_name: str
    last_name: str
    phone_no: str
    gender: str
    date_of_birth: date
    address: str
    about: str
    profile_photo: str


# student table model
class Student(StudentBase, table=True):
    phone_no: str = Field(primary_key=True, max_length=16)
    gender: str = Field(max_length=1)
    created_at: datetime | None = Field(
        default=None,
        sa_column=Column(
            DateTime(timezone=True), nullable=False, server_default=func.now()
        ),
    )
    user_id: int = Field(
        sa_column=Column(
            Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False
        )
    )


# update student model with pydantic vlidation
class StudentUpdate(SQLModel):
    first_name: str | None = None
    last_name: str | None = None
    phone_no: str| None = None
    gender: str | None = None
    date_of_birth: date | None = None
    address: str | None = None
    about: str | None = None
    profile_photo: str | None = None


# student response model for response body
class StudentResponse(StudentBase):
    user_id: int
