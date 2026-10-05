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
    Index,
    Computed,
)
from pydantic import EmailStr, model_validator, HttpUrl, field_validator
from datetime import datetime, date
from enum import Enum
from sqlalchemy.dialects.postgresql import ARRAY, TSVECTOR


# generic message model
class GenericMessage(SQLModel):
    detail: str


# access token generation model
class Token(SQLModel):
    access_token: str
    token_type: str
    role: str


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
    hashed_password: str
    student: Student = Relationship(
        back_populates="user",
        sa_relationship_kwargs={"cascade": "all, delete", "passive_deletes": True},
    )
    teacher: Teacher = Relationship(
        back_populates="user",
        sa_relationship_kwargs={"cascade": "all, delete", "passive_deletes": True},
    )


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

    @model_validator(mode="after")
    def check_empty_payload(self):
        if not self.model_fields_set:
            raise ValueError("no value")
        return self


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
            ForeignKey("student.phone_no", ondelete="CASCADE", onupdate="CASCADE"),
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
    phone_no: str = Field(primary_key=True, max_length=10)
    gender: str = Field(max_length=1)
    date_of_birth: date
    address: str
    about: str


# student table model
class Student(StudentBase, table=True):
    profile_pic: str = Field(nullable=True)
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
    review: list[Review] = Relationship(back_populates="student")


# create student model with pydantic vlidation
class StudentCreate(StudentBase):

    @field_validator("phone_no", mode="after")
    @classmethod
    def validate_phone_no(cls, value: str):
        if not value.isdigit():
            raise ValueError("phone number must contain numbers only")
        if len(value) != 10:
            raise ValueError("phone number must be exactly 10 digits long")
        return value


# update student model with pydantic vlidation
class StudentUpdate(SQLModel):
    first_name: str | None = None
    last_name: str | None = None
    phone_no: str | None = Field(default=None, max_length=10)
    gender: str | None = Field(default=None, max_length=1)
    date_of_birth: date | None = None
    address: str | None = None
    about: str | None = None

    @field_validator("phone_no", mode="after")
    @classmethod
    def validate_phone_no(cls, value: str):
        if not value.isdigit():
            raise ValueError("phone number must contain numbers only")
        if len(value) != 10:
            raise ValueError("phone number must be exactly 10 digits long")
        return value

    @model_validator(mode="after")
    def check_empty_payload(self):
        if not self.model_fields_set:
            raise ValueError("no value")
        return self


# student response model for response body
class StudentResponse(StudentBase):
    profile_pic: str | None = None
    user: UserResponse
    course: list[CoursePublicResponse] = []


# teacher base model
class TeacherBase(SQLModel):
    first_name: str
    last_name: str
    phone_no: str = Field(primary_key=True, max_length=10)
    gender: str = Field(max_length=1)
    date_of_birth: date
    address: str
    about: str


# teacher table model
class Teacher(TeacherBase, table=True):
    profile_pic: str = Field(nullable=True)
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

    @field_validator("phone_no", mode="after")
    @classmethod
    def validate_phone_no(cls, value: str):
        if not value.isdigit():
            raise ValueError("phone number must contain numbers only")
        if len(value) != 10:
            raise ValueError("phone number must be exactly 10 digits long")
        return value


# update teacher model with pydantic vlidation
class TeacherUpdate(SQLModel):
    first_name: str | None = None
    last_name: str | None = None
    phone_no: str | None = Field(default=None, max_length=10)
    gender: str | None = Field(default=None, max_length=1)
    date_of_birth: date | None = None
    address: str | None = None
    about: str | None = None

    @field_validator("phone_no", mode="after")
    @classmethod
    def validate_phone_no(cls, value: str):
        if not value.isdigit():
            raise ValueError("phone number must contain numbers only")
        if len(value) != 10:
            raise ValueError("phone number must be exactly 10 digits long")
        return value

    @model_validator(mode="after")
    def check_empty_payload(self):
        if not self.model_fields_set:
            raise ValueError("no value")
        return self


# teacher response model for response body
class TeacherResponse(TeacherBase):
    profile_pic: str | None = None
    user: UserResponse


# teacher public response model for response body
class TeacherPublicResponse(SQLModel):
    first_name: str
    last_name: str
    about: str
    profile_pic: str | None = None
    user: UserPublicResponse


# course resource type model
class CourseResourceType(str, Enum):
    document = "document"
    video = "video"


# course tags model
class CourseTags(str, Enum):
    diploma = "diploma"
    polytechnic_diploma = "polytechnic_diploma"
    ba = "ba"
    bsc = "bsc"
    bcom = "bcom"
    btech = "btech"
    be = "be"
    bca = "bca"
    bba = "bba"
    barch = "barch"
    bfa = "bfa"
    bed = "bed"
    mbbs = "mbbs"
    bds = "bds"
    bams = "bams"
    bhms = "bhms"
    bpharma = "bpharma"
    bsc_nursing = "bsc_nursing"
    llb = "llb"
    ba_llb = "ba_llb"
    bba_llb = "bba_llb"
    ma = "ma"
    msc = "msc"
    mcom = "mcom"
    mtech = "mtech"
    me = "me"
    mca = "mca"
    mba = "mba"
    md = "md"
    ms_medical = "ms_medical"
    llm = "llm"
    med = "med"
    phd = "phd"

    class_1 = "class_1"
    class_2 = "class_2"
    class_3 = "class_3"
    class_4 = "class_4"
    class_5 = "class_5"
    class_6 = "class_6"
    class_7 = "class_7"
    class_8 = "class_8"
    class_9 = "class_9"
    class_10 = "class_10"
    class_11 = "class_11"
    class_12 = "class_12"

    mathematics = "mathematics"
    algebra = "algebra"
    geometry = "geometry"
    calculus = "calculus"
    trigonometry = "trigonometry"
    statistics = "statistics"
    discrete_math = "discrete_math"
    logic = "logic"

    computer_science = "computer_science"
    software_engineering = "software_engineering"
    data_science = "data_science"
    artificial_intelligence = "artificial_intelligence"
    cybersecurity = "cybersecurity"
    web_development = "web_development"
    mobile_development = "mobile_development"
    data_structures = "data_structures"

    python = "python"
    javascript = "javascript"
    typescript = "typescript"
    java = "java"
    c_sharp = "c_sharp"
    c_plus_plus = "c_plus_plus"
    go_lang = "go_lang"
    rust = "rust"
    swift = "swift"
    kotlin = "kotlin"
    php = "php"
    ruby = "ruby"
    sql = "sql"

    physics = "physics"
    mechanics = "mechanics"
    thermodynamics = "thermodynamics"
    quantum_physics = "quantum_physics"
    astrophysics = "astrophysics"

    chemistry = "chemistry"
    organic_chemistry = "organic_chemistry"
    inorganic_chemistry = "inorganic_chemistry"
    biochemistry = "biochemistry"

    biology = "biology"
    genetics = "genetics"
    microbiology = "microbiology"
    ecology = "ecology"

    astronomy = "astronomy"
    earth_science = "earth_science"
    environmental_science = "environmental_science"

    psychology = "psychology"
    cognitive_psychology = "cognitive_psychology"
    clinical_psychology = "clinical_psychology"

    economics = "economics"
    microeconomics = "microeconomics"
    macroeconomics = "macroeconomics"

    sociology = "sociology"
    political_science = "political_science"
    anthropology = "anthropology"

    history = "history"
    ancient_history = "ancient_history"
    modern_history = "modern_history"

    philosophy = "philosophy"
    ethics = "ethics"

    visual_arts = "visual_arts"
    graphic_design = "graphic_design"
    fine_arts = "fine_arts"
    photography = "photography"

    music = "music"
    music_theory = "music_theory"
    music_production = "music_production"

    literature = "literature"
    linguistics = "linguistics"
    creative_writing = "creative_writing"

    finance = "finance"
    corporate_finance = "corporate_finance"
    investment_banking = "investment_banking"

    accounting = "accounting"
    taxation = "taxation"

    management = "management"
    project_management = "project_management"
    human_resources = "human_resources"

    marketing = "marketing"
    digital_marketing = "digital_marketing"
    seo_sem = "seo_sem"
    entrepreneurship = "entrepreneurship"

    engineering = "engineering"
    mechanical_engineering = "mechanical_engineering"
    electrical_engineering = "electrical_engineering"
    civil_engineering = "civil_engineering"

    medicine = "medicine"
    anatomy = "anatomy"
    pharmacology = "pharmacology"
    nursing = "nursing"

    law = "law"
    constitutional_law = "constitutional_law"
    corporate_law = "corporate_law"

    education = "education"
    pedagogy = "pedagogy"
    architecture = "architecture"


# course language model
class CourseLanguage(str, Enum):
    english = "english"
    bengali = "bengali"
    hindi = "hindi"


# course base model
class CourseBase(SQLModel):
    course_name: str
    course_details: str
    course_language: CourseLanguage = Field(sa_column=Column(String, nullable=False))
    course_resource_type: CourseResourceType = Field(
        sa_column=Column(String, nullable=False)
    )
    course_paid: bool
    course_price: int = Field(ge=0, le=15000)
    course_price_currency: str | None = Field(default="INR", nullable=False)
    course_tags: list[CourseTags] = Field(
        default=[],
        sa_column=Column(
            ARRAY(String),
            nullable=False,
        ),
    )


# course table model
class Course(CourseBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid7, primary_key=True)
    created_at: datetime | None = Field(
        default=None,
        sa_column=Column(
            DateTime(timezone=True), nullable=False, server_default=func.now()
        ),
    )
    search_vector: str | None = Field(
        default=None,
        sa_column=Column(
            TSVECTOR, Computed("to_tsvector('english', course_name)", persisted=True)
        ),
    )
    teacher_id: str = Field(
        sa_column=Column(
            String,
            ForeignKey("teacher.phone_no", ondelete="CASCADE", onupdate="CASCADE"),
            nullable=False,
        )
    )
    __table_args__ = (
        Index("ix_course_language", "course_language"),
        Index("ix_course_resource_type", "course_resource_type"),
        Index("ix_course_paid", "course_paid"),
        Index("ix_course_tags", "course_tags", postgresql_using="gin"),
        Index("ix_course_search_vector", "search_vector", postgresql_using="gin"),
        Index("ix_course_teacher_id", "teacher_id"),
    )

    teacher: Teacher = Relationship(back_populates="course")
    purchase: Purchase = Relationship(back_populates="course")
    student: list[Student] = Relationship(
        back_populates="course", link_model=Enrollment
    )
    media: list[Media] = Relationship(back_populates="course")
    review: list[Review] = Relationship(back_populates="course")


# create course model with pydantic vlidation
class CourseCreate(CourseBase):

    @field_validator("course_tags", mode="after")
    @classmethod
    def validate_tags(cls, course_tags: list[CourseTags]):
        if course_tags:
            if len(course_tags) != len(set(course_tags)):
                raise ValueError("duplicate tags are not allowed")
            if len(course_tags) > 5:
                raise ValueError("maximum of 5 tags only")
        return course_tags

    @model_validator(mode="after")
    def check_valid_price(self):
        if self.course_paid == True and self.course_price <= 0:
            raise ValueError("paid course price needs to be more than 0")
        elif self.course_paid == False and self.course_price > 0:
            raise ValueError("free course price needs to be 0")
        return self


# update course model with pydantic vlidation
class CourseUpdate(SQLModel):
    course_name: str | None = None
    course_details: str | None = None
    course_language: CourseLanguage | None = None
    course_paid: bool | None = None
    course_price: int | None = Field(default=None, ge=0, le=15000)
    course_price_currency: str | None = Field(default="INR")
    course_tags: list[CourseTags] | None = None

    @field_validator("course_tags", mode="after")
    @classmethod
    def validate_tags(cls, course_tags: list[CourseTags]):
        if course_tags:
            if len(course_tags) != len(set(course_tags)):
                raise ValueError("duplicate tags are not allowed")
            if len(course_tags) > 5:
                raise ValueError("maximum of 5 tags only")
        return course_tags

    @model_validator(mode="after")
    def check_empty_payload(self):
        if not self.model_fields_set:
            raise ValueError("no value")
        return self


# course response model for response body
class CourseResponse(CourseBase):
    id: uuid.UUID
    teacher: TeacherResponse


# course public response model for response body
class CoursePublicResponse(CourseBase):
    id: uuid.UUID
    teacher: TeacherPublicResponse
    media: list[MediaPublicResponse]


# course media upload status
class MediaUploadStatus(str, Enum):
    pending = "pending"
    complete = "complete"


# course media upload category
class MediaUploadCategory(str, Enum):
    thumbnail = "thumbnail"
    resource = "resource"


# course media upload type
class MediaUploadType(str, Enum):
    document_pdf = "application/pdf"
    video_mp4 = "video/mp4"
    image_jpeg = "image/jpeg"
    image_png = "image/png"


# course media upload file type
class MediaUploadFileType(str, Enum):
    mp4 = "mp4"
    pdf = "pdf"
    jpg = "jpg"
    png = "png"


# course resources media model
class Media(SQLModel, table=True):
    category: str
    media_type: str
    file_name: str
    file_extension: str
    s3_key: str = Field(unique=True)
    status: str = Field(default=MediaUploadStatus.pending)
    id: uuid.UUID = Field(primary_key=True)
    created_at: datetime | None = Field(
        default=None,
        sa_column=Column(
            DateTime(timezone=True), nullable=False, server_default=func.now()
        ),
    )
    course_id: uuid.UUID = Field(
        sa_column=Column(
            Uuid,
            ForeignKey("course.id", ondelete="CASCADE"),
            nullable=False,
        )
    )
    __table_args__ = (Index("ix_media_course_id", "course_id"),)

    course: Course = Relationship(back_populates="media")


# upload course media model with pydantic vlidation
class MediaUpload(SQLModel):
    category: MediaUploadCategory
    media_type: MediaUploadType
    file_name: str
    file_extension: MediaUploadFileType


# media upload presigned model
class MediaUploadPresigned(SQLModel):
    media_id: uuid.UUID
    upload_url: HttpUrl


# media access presigned model
class MediaAccessPresigned(SQLModel):
    course_id: uuid.UUID
    stream_url: HttpUrl


# media public response model
class MediaPublicResponse(SQLModel):
    id: uuid.UUID
    category: MediaUploadCategory


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
            ForeignKey("student.phone_no", ondelete="CASCADE", onupdate="CASCADE"),
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
    __table_args__ = (
        Index("ix_purchase_student_id", "student_id"),
        Index("ix_purchase_course_id", "course_id"),
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


# review base model
class ReviewBase(SQLModel):
    comment: str | None = Field(default=None)
    rate: int | None = Field(default=None, ge=1, le=5)


# review table model
class Review(ReviewBase, table=True):
    student_id: str = Field(
        sa_column=Column(
            String,
            ForeignKey("student.phone_no", ondelete="CASCADE", onupdate="CASCADE"),
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
    created_at: datetime | None = Field(
        default=None,
        sa_column=Column(
            DateTime(timezone=True), nullable=False, server_default=func.now()
        ),
    )
    course: Course = Relationship(back_populates="review")
    student: Student = Relationship(back_populates="review")


# create review model with pydantic vlidation
class ReviewCreate(ReviewBase):
    pass


# update Review model with pydantic vlidation
class ReviewUpdate(SQLModel):
    comment: str | None = None
    rate: int | None = Field(default=None, ge=1, le=5)

    @model_validator(mode="after")
    def check_empty_payload(self):
        if not self.model_fields_set:
            raise ValueError("no value")
        return self


# review response model for response body
class ReviewResponse(SQLModel):
    comment: str
    rate: int
    course_id: uuid.UUID


# review public response model for response body
class ReviewPublicResponse(SQLModel):
    comment: str
    rate: int
    first_name: str
    last_name: str
    course_id: uuid.UUID


# rating public response model for response body
class RatingPublicResponse(SQLModel):
    total_reviews: int
    average_rating: int | float
    course_id: uuid.UUID
