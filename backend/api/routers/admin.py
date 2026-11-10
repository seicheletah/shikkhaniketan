import uuid
import secrets
import string
import io
#import pandas
from fastapi import Response, status, HTTPException, APIRouter, BackgroundTasks
from fastapi.responses import StreamingResponse
from backend.core.database import SessionDep
from backend.core.security import get_password_hash, AdminDep
from backend.core.config import settings
from backend.utils import send_otp
from backend.models import (
    AdminUser,
    AdminUserCreate,
    AdminUserResponse,
    AdminUserUpdate,
    AdminUserOtp,
    AdminAccessToken,
    AdminUserVerifyEmail,
    AdminUserVerifyToken,
    AdminAcessTokenResponse,
    AdminActionHistory,
    AdminAction,
    AdminActionResource,
    AdminActionHistoryResponse,
    User,
    UserUpdate,
    UserAdminResponse,
    Student,
    StudentUpdate,
    StudentAdminResponse,
    Teacher,
    TeacherUpdate,
    TeacherAdminResponse,
    Course,
    CourseUpdate,
    CourseAdminResponse,
    Enrollment,
    Review,
    ReviewAdminResponse,
    Purchase,
    PurchaseAdminResponse,
    GenericMessage,
)
from sqlmodel import select, col
from sqlalchemy.exc import SQLAlchemyError
from datetime import datetime, timedelta, timezone

api_router = APIRouter(prefix="/admin", tags=["Admin"])


@api_router.post(
    "/", status_code=status.HTTP_201_CREATED, response_model=AdminUserResponse
)
async def create_admin_user(
    userdata: AdminUserCreate, db_session: SessionDep, background_tasks: BackgroundTasks
):
    """
    Create an admin user. It also sends email OTP.
    """
    existing_admin_user_email_id = db_session.exec(
        select(AdminUser).where(AdminUser.email_id == userdata.email_id)
    ).first()
    try:
        if existing_admin_user_email_id:
            if existing_admin_user_email_id.is_verified:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"email id already exists",
                )
            else:
                db_session.delete(existing_admin_user_email_id)
                db_session.commit()
        userdata.hashed_password = get_password_hash(userdata.hashed_password)
        admin_user = AdminUser(**userdata.model_dump())
        db_session.add(admin_user)
        db_session.flush()
        code = "".join(secrets.choice(string.digits) for _ in range(6))
        expiration = datetime.now(timezone.utc) + timedelta(
            minutes=settings.OTP_EXPIRE_MINUTES
        )
        otp = AdminUserOtp(
            admin_user_id=admin_user.id, code=code, expires_at=expiration
        )
        db_session.add(otp)
        db_session.commit()
        db_session.refresh(admin_user)
        background_tasks.add_task(send_otp, admin_user.email_id, code)
        return admin_user
    except SQLAlchemyError:
        db_session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error has occurred",
        )


@api_router.post("/verify-email", response_model=GenericMessage)
def verify_user_email(userdata: AdminUserVerifyEmail, db_session: SessionDep):
    """
    verify an admin user email with OTP.
    """
    otp = db_session.exec(
        select(AdminUserOtp)
        .where(AdminUserOtp.admin_user_id == userdata.user_id)
        .where(AdminUserOtp.code == userdata.code)
    ).first()
    if not otp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="invalid verification code"
        )
    try:
        if otp.expires_at < datetime.now(timezone.utc):
            db_session.delete(otp)
            db_session.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="invalid verification code",
            )
        user = db_session.get(AdminUser, userdata.user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail=f"user id not found"
            )
        user.is_verified = True
        db_session.add(user)
        db_session.delete(otp)
        db_session.commit()
        return {"detail": "account verified"}
    except SQLAlchemyError:
        db_session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error has occurred",
        )


@api_router.post("/verify-token", response_model=GenericMessage)
def verify_admin_user_token(userdata: AdminUserVerifyToken, db_session: SessionDep):
    """
    verify an admin user access token.
    """
    token = db_session.exec(
        select(AdminAccessToken)
        .where(AdminAccessToken.token == userdata.token)
        .where(AdminAccessToken.is_active == True)
    ).first()
    if not token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="invalid token"
        )
    if token.expires_at < datetime.now(timezone.utc):
        token.is_active = False
        try:
            db_session.add(token)
            db_session.commit()
        except SQLAlchemyError:
            db_session.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="invalid token",
        )
    admin_user = db_session.exec(
        select(AdminUser)
        .where(AdminUser.id == userdata.user_id)
        .where(AdminUser.is_verified == True)
        .where(AdminUser.admin_access == False)
    ).first()
    if not admin_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"admin user id not found"
        )
    admin_user.admin_access = True
    token.client_user_id = userdata.user_id
    token.is_active = False
    try:
        db_session.add(admin_user)
        db_session.add(token)
        db_session.commit()
        return {"detail": "admin access granted"}
    except SQLAlchemyError:
        db_session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error has occurred",
        )


@api_router.post("/generate-access-token", response_model=AdminAcessTokenResponse)
def generate_admin_access_token(db_session: SessionDep, current_user: AdminDep):
    """
    Generate a admin access token.
    """
    generated_token = "".join(secrets.choice(string.hexdigits) for _ in range(16))
    expiration = datetime.now(timezone.utc) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    admin_access_token = AdminAccessToken(
        token=generated_token, expires_at=expiration, creator_user_id=current_user.id
    )
    try:
        db_session.add(admin_access_token)
        db_session.commit()
        db_session.refresh(admin_access_token)
        return admin_access_token
    except SQLAlchemyError:
        db_session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error has occurred",
        )


@api_router.get("/past-access-token", response_model=list[AdminAcessTokenResponse])
def get_past_access_tokens(
    current_user: AdminDep,
    db_session: SessionDep,
    offset: int | None = None,
    limit: int = 50,
):
    """
    Get all past generated access token details.
    """
    statement = select(AdminAccessToken).order_by(col(AdminAccessToken.id).desc())
    if offset:
        statement = statement.offset(offset)
    if limit:
        statement = statement.limit(limit)
    actions = db_session.exec(statement).all()
    return actions


@api_router.get("/me", response_model=AdminUserResponse)
def get_self(db_session: SessionDep, current_user: AdminDep):
    """
    Get own admin user details.
    """
    admin_user = db_session.get(AdminUser, current_user.id)
    return admin_user


@api_router.get("/actions", response_model=list[AdminActionHistoryResponse])
def get_action_history(
    current_user: AdminDep,
    db_session: SessionDep,
    offset: int | None = None,
    limit: int = 50,
):
    """
    Get all admin action history.
    """
    statement = select(AdminActionHistory)
    if offset:
        statement = statement.offset(offset)
    if limit:
        statement = statement.limit(limit)
    actions = db_session.exec(statement).all()
    return actions


# users management section


@api_router.get("/users", response_model=list[UserAdminResponse])
def get_users(
    current_user: AdminDep,
    db_session: SessionDep,
    last_id: uuid.UUID | None = None,
    limit: int = 50,
):
    """
    Get all user details.
    """
    statement = select(User).order_by(col(User.id).desc())
    if last_id:
        statement = statement.where(User.id < last_id)
    statement = statement.limit(limit)
    users = db_session.exec(statement).all()
    return users


@api_router.get("/users/{id}", response_model=UserAdminResponse)
def get_user(id: uuid.UUID, db_session: SessionDep, current_user: AdminDep):
    """
    Get a specific user details by ID.
    """
    user = db_session.get(User, id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"user id not found",
        )
    return user


@api_router.delete("/users/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(id: uuid.UUID, db_session: SessionDep, current_user: AdminDep):
    """
    Delete a user by ID.
    """
    user = db_session.get(User, id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"user id not found"
        )
    admin_action = AdminActionHistory(
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        action=AdminAction.delete,
        resource=AdminActionResource.user,
        admin_user_id=current_user.id,
        resource_id=str(user.id),
        resource_data=f"email_id: f{user.email_id}",
    )
    try:
        db_session.delete(user)
        db_session.add(admin_action)
        db_session.commit()
    except SQLAlchemyError:
        db_session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error has occurred",
        )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@api_router.patch("/users/{id}", response_model=UserAdminResponse)
def update_user(
    id: uuid.UUID, userdata: UserUpdate, db_session: SessionDep, current_user: AdminDep
):
    """
    Update a user by ID.
    """
    user = db_session.get(User, id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"user id not found"
        )
    if userdata.email_id:
        existing_email_id = db_session.exec(
            select(User).where(User.email_id == userdata.email_id)
        ).first()
        if existing_email_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail=f"email id already exists"
            )
    if userdata.hashed_password:
        userdata.hashed_password = get_password_hash(userdata.hashed_password)
    user.sqlmodel_update(userdata.model_dump(exclude_unset=True))
    admin_action = AdminActionHistory(
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        action=AdminAction.update,
        resource=AdminActionResource.user,
        admin_user_id=current_user.id,
        resource_id=str(user.id),
        resource_data=str(userdata),
    )
    try:
        db_session.add(user)
        db_session.add(admin_action)
        db_session.commit()
        db_session.refresh(user)
        return user
    except SQLAlchemyError:
        db_session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error has occurred",
        )


# students management section


@api_router.get("/students", response_model=list[StudentAdminResponse])
def get_students(
    current_user: AdminDep,
    db_session: SessionDep,
    offset: int | None = None,
    limit: int = 50,
):
    """
    Get all student details.
    """
    statement = select(Student)
    if offset:
        statement = statement.offset(offset)
    if limit:
        statement = statement.limit(limit)
    students = db_session.exec(statement).all()
    return students


@api_router.get("/students/{id}", response_model=StudentAdminResponse)
def get_student(id: uuid.UUID, db_session: SessionDep, current_user: AdminDep):
    """
    Get a specific student details by ID.
    """
    student = db_session.exec(select(Student).where(Student.user_id == id)).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"user id not found",
        )
    return student


@api_router.patch("/students/{id}", response_model=StudentAdminResponse)
def update_student(
    id: uuid.UUID,
    studentdata: StudentUpdate,
    db_session: SessionDep,
    current_user: AdminDep,
):
    """
    Update student details by ID.
    """
    student = db_session.exec(select(Student).where(Student.user_id == id)).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"student id not found"
        )
    if studentdata.phone_no:
        phone_no = db_session.exec(
            select(Student).where(Student.phone_no == studentdata.phone_no)
        ).first()
        if phone_no:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="phone number already exists",
            )
    student.sqlmodel_update(studentdata.model_dump(exclude_unset=True))
    admin_action = AdminActionHistory(
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        action=AdminAction.update,
        resource=AdminActionResource.student,
        admin_user_id=current_user.id,
        resource_id=str(student.user_id),
        resource_data=str(studentdata),
    )
    try:
        db_session.add(student)
        db_session.add(admin_action)
        db_session.commit()
        db_session.refresh(student)
        return student
    except SQLAlchemyError:
        db_session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error has occurred",
        )


# teachers management section


@api_router.get("/teachers", response_model=list[TeacherAdminResponse])
def get_teachers(
    current_user: AdminDep,
    db_session: SessionDep,
    offset: int | None = None,
    limit: int = 50,
):
    """
    Get all teacher details.
    """
    statement = select(Teacher)
    if offset:
        statement = statement.offset(offset)
    if limit:
        statement = statement.limit(limit)
    teachers = db_session.exec(statement).all()
    return teachers


@api_router.get("/teachers/{id}", response_model=TeacherAdminResponse)
def get_teacher(id: uuid.UUID, db_session: SessionDep, current_user: AdminDep):
    """
    Get a specific teacher details by ID.
    """
    teacher = db_session.exec(select(Teacher).where(Teacher.user_id == id)).first()
    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"user id not found",
        )
    return teacher


@api_router.patch("/teachers/{id}", response_model=TeacherAdminResponse)
def update_teacher(
    id: uuid.UUID,
    teacherdata: TeacherUpdate,
    db_session: SessionDep,
    current_user: AdminDep,
):
    """
    Update teacher details by ID.
    """
    teacher = db_session.exec(select(Teacher).where(Teacher.user_id == id)).first()
    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"teacher id not found"
        )
    if teacherdata.phone_no:
        phone_no = db_session.exec(
            select(Teacher).where(Teacher.phone_no == teacherdata.phone_no)
        ).first()
        if phone_no:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="phone number already exists",
            )
    teacher.sqlmodel_update(teacherdata.model_dump(exclude_unset=True))
    admin_action = AdminActionHistory(
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        action=AdminAction.update,
        resource=AdminActionResource.teacher,
        admin_user_id=current_user.id,
        resource_id=str(teacher.user_id),
        resource_data=str(teacherdata),
    )
    try:
        db_session.add(teacher)
        db_session.add(admin_action)
        db_session.commit()
        db_session.refresh(teacher)
        return teacher
    except SQLAlchemyError:
        db_session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error has occurred",
        )


# courses management section


@api_router.get("/courses/{id}", response_model=CourseAdminResponse)
def get_course(id: uuid.UUID, current_user: AdminDep, db_session: SessionDep):
    """
    Get single course details with ID.
    """
    course = db_session.get(Course, id)
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"course not found",
        )
    return course


@api_router.get("/courses", response_model=list[CourseAdminResponse])
def get_courses(
    current_user: AdminDep,
    db_session: SessionDep,
    offset: int | None = None,
    limit: int = 50,
):
    """
    Get all course details.
    """
    statement = select(Course).order_by(col(Course.id).desc())
    if offset:
        statement = statement.offset(offset)
    if limit:
        statement = statement.limit(limit)
    courses = db_session.exec(statement).all()
    return courses


@api_router.patch("/courses/{id}", response_model=CourseAdminResponse)
def update_course(
    id: uuid.UUID,
    coursedata: CourseUpdate,
    db_session: SessionDep,
    current_user: AdminDep,
):
    """
    Update a course details with ID.
    """
    course = db_session.get(Course, id)
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"course not found"
        )
    course.sqlmodel_update(coursedata.model_dump(exclude_unset=True))
    admin_action = AdminActionHistory(
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        action=AdminAction.update,
        resource=AdminActionResource.course,
        admin_user_id=current_user.id,
        resource_id=str(course.id),
        resource_data=str(coursedata),
    )
    try:
        db_session.add(course)
        db_session.add(admin_action)
        db_session.commit()
        db_session.refresh(course)
        return course
    except SQLAlchemyError:
        db_session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error has occurred",
        )


@api_router.delete("/courses/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_course(id: uuid.UUID, db_session: SessionDep, current_user: AdminDep):
    """
    Delete a course by ID.
    """
    course = db_session.get(Course, id)
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"course not found"
        )
    enrollment = db_session.exec(
        select(Enrollment).where(Enrollment.course_id == id)
    ).first()
    if enrollment:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="course has enrollment",
        )
    admin_action = AdminActionHistory(
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        action=AdminAction.delete,
        resource=AdminActionResource.course,
        admin_user_id=current_user.id,
        resource_id=str(course.id),
        resource_data=f"course_id: {course.id}",
    )
    try:
        db_session.delete(course)
        db_session.add(admin_action)
        db_session.commit()
    except SQLAlchemyError:
        db_session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error has occurred",
        )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# review management section


@api_router.get("/reviews", response_model=list[ReviewAdminResponse])
def get_all_reviews(
    db_session: SessionDep,
    current_user: AdminDep,
    offset: int | None = None,
    limit: int = 50,
):
    """
    Get all reviews.
    """
    statement = select(
        Review, Student.first_name, Student.last_name, Student.user_id
    ).join(Student)
    if offset:
        statement = statement.offset(offset)
    if limit:
        statement = statement.limit(limit)
    review = db_session.exec(statement).all()
    formatted_review = []
    for review, first_name, last_name, user_id in review:
        review_dict = review.model_dump()
        review_dict["first_name"] = first_name
        review_dict["last_name"] = last_name
        review_dict["user_id"] = user_id
        formatted_review.append(review_dict)
    return formatted_review


@api_router.get("/reviews/courses/{id}", response_model=list[ReviewAdminResponse])
def get_course_reviews(
    id: uuid.UUID,
    db_session: SessionDep,
    current_user: AdminDep,
    offset: int | None = None,
    limit: int = 50,
):
    """
    Get all reviews on a specific course by ID.
    """
    course = db_session.get(Course, id)
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"course not found"
        )
    statement = (
        select(Review, Student.first_name, Student.last_name, Student.user_id)
        .join(Student)
        .where(Review.course_id == id)
    )
    if offset:
        statement = statement.offset(offset)
    if limit:
        statement = statement.limit(limit)
    review = db_session.exec(statement).all()
    formatted_review = []
    for review, first_name, last_name, user_id in review:
        review_dict = review.model_dump()
        review_dict["first_name"] = first_name
        review_dict["last_name"] = last_name
        review_dict["user_id"] = user_id
        formatted_review.append(review_dict)
    return formatted_review


@api_router.delete(
    "/reviews/students/{student_id}/courses/{course_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_review(
    student_id: str,
    course_id: uuid.UUID,
    db_session: SessionDep,
    current_user: AdminDep,
):
    """
    Delete a review done to a course by ID.
    """
    student = db_session.exec(
        select(Student).where(Student.phone_no == student_id)
    ).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"student id not found"
        )
    course = db_session.get(Course, course_id)
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"course not found"
        )
    existing_review = db_session.exec(
        select(Review)
        .where(Review.course_id == course_id)
        .where(Review.student_id == student.phone_no)
    ).first()
    if not existing_review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"review not found",
        )
    admin_action = AdminActionHistory(
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        action=AdminAction.delete,
        resource=AdminActionResource.review,
        admin_user_id=current_user.id,
        resource_id=str(course.id),
        resource_data=f"student_id: {student.phone_no}, course_id: {course.id}",
    )
    try:
        db_session.delete(existing_review)
        db_session.add(admin_action)
        db_session.commit()
    except SQLAlchemyError:
        db_session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error has occurred",
        )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# purchase management section


@api_router.get("/purchases", response_model=list[PurchaseAdminResponse])
def get_purchases(
    current_user: AdminDep,
    db_session: SessionDep,
    offset: int | None = None,
    limit: int = 50,
):
    """
    Get all purchase details.
    """
    statement = select(Purchase).order_by(col(Purchase.id).desc())
    if offset:
        statement = statement.offset(offset)
    if limit:
        statement = statement.limit(limit)
    students = db_session.exec(statement).all()
    return students


# @api_router.get("/purchases/export")
# def export_purchases(current_user: AdminDep, db_session: SessionDep):
#     """
#     Get excel sheet for purchases data.
#     """
#     purchase = db_session.exec(select(Purchase)).all()
#     purchase_data = [purchase.model_dump() for purchase in purchase]
#     dataframe = pandas.DataFrame(purchase_data)
#     for col in dataframe.columns:
#         if (
#             pandas.api.types.is_datetime64_any_dtype(dataframe[col])
#             or dataframe[col].dtype == "object"
#         ):
#             try:
#                 dataframe[col] = pandas.to_datetime(dataframe[col]).dt.tz_localize(None)
#             except (AttributeError, ValueError, TypeError):
#                 pass
#     buffer = io.BytesIO()
#     with pandas.ExcelWriter(buffer, engine="openpyxl") as writer:
#         dataframe.to_excel(writer, index=False, sheet_name="Purchases")
#     buffer.seek(0)
#     headers = {"Content-Disposition": 'attachment; filename="purchases_report.xlsx"'}
#     return StreamingResponse(
#         buffer,
#         media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
#         headers=headers,
#     )
