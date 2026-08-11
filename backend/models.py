import uuid
from sqlmodel import (
    Field,
    SQLModel,
    func,
    Column,
    DateTime,
    String,
    Uuid,
    ForeignKey,
    Relationship,
)
from pydantic import EmailStr, model_validator
from datetime import datetime, date
from enum import Enum


# access token generation model
class Token(SQLModel):
    access_token: str
    token_type: str


# token data valdation model
class TokenData(SQLModel):
    id: uuid.UUID | None = None
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
    role: str


# user table model
class User(UserBase, table=True):
    email_id: EmailStr = Field(unique=True)
    id: uuid.UUID = Field(default_factory=uuid.uuid7, primary_key=True)
    created_at: datetime | None = Field(
        default=None,
        sa_column=Column(
            DateTime(timezone=True), nullable=False, server_default=func.now()
        ),
    )
    hashed_password: str = Field(unique=True)
    student: Student = Relationship(back_populates="user")
    teacher: Teacher = Relationship(back_populates="user")


# create user model with pydantic vlidation
class UserCreate(SQLModel):
    email_id: EmailStr
    role: UserRole
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
    id: uuid.UUID


# user public response model for response body
class UserPublicResponse(SQLModel):
    id: uuid.UUID


# for checking request data validation with pydantic
class UserLogin(UserCreate):
    pass


# course enrollment validation model
class Enrollment(SQLModel, table=True):
    student_id: str = Field(
        sa_column=Column(
            String,
            ForeignKey("student.phone_no", ondelete="CASCADE"),
            primary_key=True,
            nullable=False,
        )
    )
    course_id: uuid.UUID = Field(
        sa_column=Column(
            Uuid,
            ForeignKey("course.id", ondelete="CASCADE"),
            primary_key=True,
            nullable=False,
        )
    )


# student base model
class StudentBase(SQLModel):
    first_name: str
    last_name: str
    phone_no: str = Field(primary_key=True, max_length=16)
    gender: str = Field(max_length=1)
    date_of_birth: date
    address: str
    about: str
    profile_photo: str


# student table model
class Student(StudentBase, table=True):
    created_at: datetime | None = Field(
        default=None,
        sa_column=Column(
            DateTime(timezone=True), nullable=False, server_default=func.now()
        ),
    )
    user_id: uuid.UUID | None = Field(
        sa_column=Column(
            Uuid,
            ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        )
    )
    user: User = Relationship(back_populates="student")
    purchase: Purchase = Relationship(back_populates="student")
    course: list[Course] = Relationship(back_populates="student", link_model=Enrollment)


# create student model with pydantic vlidation
class StudentCreate(StudentBase):
    pass


# update student model with pydantic vlidation
class StudentUpdate(SQLModel):
    first_name: str | None = None
    last_name: str | None = None
    phone_no: str | None = Field(default=None, max_length=16)
    gender: str | None = Field(default=None, max_length=1)
    date_of_birth: date | None = None
    address: str | None = None
    about: str | None = None
    profile_photo: str | None = None


# student response model for response body
class StudentResponse(StudentBase):
    user: UserResponse


# teacher base model
class TeacherBase(SQLModel):
    first_name: str
    last_name: str
    phone_no: str = Field(primary_key=True, max_length=16)
    gender: str = Field(max_length=1)
    date_of_birth: date
    address: str
    about: str
    profile_photo: str


# teacher table model
class Teacher(TeacherBase, table=True):
    created_at: datetime | None = Field(
        default=None,
        sa_column=Column(
            DateTime(timezone=True), nullable=False, server_default=func.now()
        ),
    )
    user_id: uuid.UUID = Field(
        sa_column=Column(
            Uuid,
            ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        )
    )
    user: User = Relationship(back_populates="teacher")
    course: list[Course] = Relationship(back_populates="teacher")


# create student model with pydantic vlidation
class TeacherCreate(TeacherBase):
    pass


# update teacher model with pydantic vlidation
class TeacherUpdate(SQLModel):
    first_name: str | None = None
    last_name: str | None = None
    phone_no: str | None = Field(default=None, max_length=16)
    gender: str | None = Field(default=None, max_length=1)
    date_of_birth: date | None = None
    address: str | None = None
    about: str | None = None
    profile_photo: str | None = None


# teacher response model for response body
class TeacherResponse(TeacherBase):
    user: UserResponse


# teacher public response model for response body
class TeacherPublicResponse(SQLModel):
    first_name: str
    last_name: str
    about: str
    profile_photo: str
    user: UserPublicResponse


# course base model
class CourseBase(SQLModel):
    course_name: str
    course_details: str
    course_language: str
    course_file_type: str
    course_paid: bool
    course_price: int = Field(ge=0, le=15000)
    # remove thumbnail and file unique key if database becomes slow
    course_thumbnail: str = Field(unique=True)
    course_file: str = Field(unique=True)


# course table model
class Course(CourseBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid7, primary_key=True)
    created_at: datetime | None = Field(
        default=None,
        sa_column=Column(
            DateTime(timezone=True), nullable=False, server_default=func.now()
        ),
    )
    teacher_id: str = Field(
        sa_column=Column(
            String,
            ForeignKey("teacher.phone_no", ondelete="CASCADE"),
            nullable=False,
        )
    )
    teacher: Teacher = Relationship(back_populates="course")
    purchase: Purchase = Relationship(back_populates="course")
    student: list[Student] = Relationship(
        back_populates="course", link_model=Enrollment
    )


# create course model with pydantic vlidation
class CourseCreate(CourseBase):
    pass


# update course model with pydantic vlidation
class CourseUpdate(SQLModel):
    course_name: str | None = None
    course_details: str | None = None
    course_language: str | None = None
    course_file_type: str | None = None
    course_paid: bool | None = None
    course_price: int | None = Field(default=None, ge=0, le=15000)
    course_thumbnail: str | None = None
    course_file: str | None = None


# course response model for response body
class CourseResponse(CourseBase):
    id: uuid.UUID
    teacher: TeacherResponse


# course public response model for response body
class CoursePublicResponse(CourseBase):
    id: uuid.UUID
    teacher: TeacherPublicResponse


# purchase base model
class PurchaseBase(SQLModel):
    # course price is in paise for razorpay
    amount: int
    currency: str = Field(default="INR")
    razorpay_order_id: str = Field(unique=True)
    razorpay_payment_id: str | None = Field(default=None, unique=True)
    razorpay_signature: str | None = Field(default=None)
    status: str
    created_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False)
    )


# purchase table model
class Purchase(PurchaseBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid7, primary_key=True)
    student_id: str = Field(
        sa_column=Column(
            String,
            ForeignKey("student.phone_no", ondelete="CASCADE"),
            nullable=False,
        )
    )
    course_id: uuid.UUID = Field(
        sa_column=Column(
            Uuid,
            ForeignKey("course.id", ondelete="CASCADE"),
            nullable=False,
        )
    )
    student: Student = Relationship(back_populates="purchase")
    course: Course = Relationship(back_populates="purchase")


# create purchase order response model
class PurchaseOrderResponse(SQLModel):
    key_id: str
    id: str
    amount: int
    currency: str


# verifying payment siganature model
class PurchaseVerify(SQLModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    course_id: uuid.UUID
