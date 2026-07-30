from sqlmodel import Field, SQLModel, func, Column, DateTime
from pydantic import EmailStr
from datetime import datetime, date


# user base model
class UserBase(SQLModel):
    email_id: EmailStr
    role: str


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


# update user model with pydantic vlidation
class UserUpdate(SQLModel):
    email_id: EmailStr | None = None
    hashed_password: str | None = None


# user response model for response body
class UserResponse(UserBase):
    pass


# for checking request data validation with pydantic
class UserLogin(UserCreate):
    pass


# student base model
class StudentBase(SQLModel):
    first_name: str
    last_name: str
    phone_no: str = Field(max_length=16)
    gender: str = Field(max_length=1)
    date_of_birth: date
    address: str
    about: str
    profile_photo: str


# student table model
class Student(StudentBase, table=True):
    id: int | None = Field(default=None, primary_key=True)
    created_at: datetime | None = Field(
        default=None,
        sa_column=Column(
            DateTime(timezone=True), nullable=False, server_default=func.now()
        ),
    )


# update student model with pydantic vlidation
class StudentUpdate(SQLModel):
    first_name: str | None = None
    last_name: str | None = None
    phone_no: int | None = None
    gender: str | None = None
    age: int | None = None
    address: str | None = None
    about: str | None = None
    profile_photo: str | None = None


# student response model for response body
class StudentResponse(StudentBase):
    pass
