from sqlmodel import Field, SQLModel, func, Column, DateTime
from datetime import datetime, date


# admin model
class UserBase(SQLModel):
    email_id: str
    role: str


class User(UserBase, table=True):
    id: int | None = Field(default=None, primary_key=True)
    created_at: datetime | None = Field(
        default=None,
        sa_column=Column(
            DateTime(timezone=True), nullable=False, server_default=func.now()
        ),
    )
    hashed_password: str


class UserUpdate(SQLModel):
    email_id: str | None = None
    hashed_password: str | None = None


class UserResponse(UserBase):
    pass


# student model
class StudentBase(SQLModel):
    first_name: str
    last_name: str
    phone_no: str = Field(max_length=16)
    gender: str = Field(max_length=1)
    date_of_birth: date
    address: str
    about: str
    profile_photo: str


class Student(StudentBase, table=True):
    id: int | None = Field(default=None, primary_key=True)
    created_at: datetime | None = Field(
        default=None,
        sa_column=Column(
            DateTime(timezone=True), nullable=False, server_default=func.now()
        ),
    )


class StudentUpdate(SQLModel):
    first_name: str | None = None
    last_name: str | None = None
    phone_no: int | None = None
    gender: str | None = None
    age: int | None = None
    address: str | None = None
    about: str | None = None
    profile_photo: str | None = None


class StudentResponse(StudentBase):
    pass
