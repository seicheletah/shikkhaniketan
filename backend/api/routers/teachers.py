import uuid
from fastapi import status, HTTPException, APIRouter, Response, UploadFile
from backend.core.database import SessionDep
from backend.core.security import TeacherDep, AdminDep, LoginDep
from backend.models import (
    Teacher,
    TeacherCreate,
    TeacherResponse,
    TeacherUpdate,
    Course,
    CourseResponse,
    CoursePublicResponse,
    CourseUpdate,
    GenericMessage,
)
from sqlmodel import select
from sqlalchemy.exc import SQLAlchemyError
from backend.utils import upload_to_s3, check_valid_file
from backend.core.config import settings

api_router = APIRouter(prefix="/teachers", tags=["Teachers"])


@api_router.post(
    "/", status_code=status.HTTP_201_CREATED, response_model=TeacherResponse
)
def create_teacher(
    userdata: TeacherCreate, db_session: SessionDep, current_user: TeacherDep
):
    """
    Create teacher.
    """
    if current_user.id is not None:
        teacher = db_session.exec(
            select(Teacher).where(Teacher.user_id == current_user.id)
        ).first()
        if teacher:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="teacher profile already exists",
            )
        phone_no = db_session.exec(
            select(Teacher).where(Teacher.phone_no == userdata.phone_no)
        ).first()
        if phone_no:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="phone number already exists",
            )
        teacher = Teacher(user_id=current_user.id, **userdata.model_dump())
        try:
            db_session.add(teacher)
            db_session.commit()
            db_session.refresh(teacher)
            return teacher
        except SQLAlchemyError:
            db_session.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An unexpected error has occurred",
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"invalid credentials",
        )


@api_router.post(
    "/profile-pic/upload",
    status_code=status.HTTP_201_CREATED,
    response_model=GenericMessage,
)
def upload_profile_pic(
    file: UploadFile,
    db_session: SessionDep,
    current_user: TeacherDep,
):
    """
    Upload profile pic.
    """
    teacher = db_session.exec(
        select(Teacher).where(Teacher.user_id == current_user.id)
    ).first()
    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"teacher id not found"
        )
    check_valid_file(file, "image")
    unique_id = uuid.uuid4().hex[:8]
    s3_profile_pic_key = f"profile_pic/{unique_id}_{file.filename}"
    public_url = f"https://{settings.CLOUDFRONT_DOMAIN_NAME}/{s3_profile_pic_key}"
    upload_response = upload_to_s3(file, s3_profile_pic_key)
    try:
        teacher.profile_pic = public_url
        db_session.add(teacher)
        db_session.commit()
    except SQLAlchemyError:
        db_session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error has occurred",
        )
    return upload_response


@api_router.get("/me", response_model=TeacherResponse)
def get_self(db_session: SessionDep, current_user: TeacherDep):
    """
    Get own teacher details.
    """
    teacher = db_session.exec(
        select(Teacher).where(Teacher.user_id == current_user.id)
    ).first()
    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"teacher id not found"
        )
    return teacher


@api_router.patch("/me", response_model=TeacherResponse)
def update_self(
    userdata: TeacherUpdate, db_session: SessionDep, current_user: TeacherDep
):
    """
    Update self teacher details.
    """
    teacher = db_session.exec(
        select(Teacher).where(Teacher.user_id == current_user.id)
    ).first()
    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"teacher id not found"
        )
    if userdata.phone_no:
        phone_no = db_session.exec(
            select(Teacher).where(Teacher.phone_no == userdata.phone_no)
        ).first()
        if phone_no:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="phone number already exists",
            )
    teacher.sqlmodel_update(userdata.model_dump(exclude_unset=True))
    try:
        db_session.add(teacher)
        db_session.commit()
        db_session.refresh(teacher)
        return teacher
    except SQLAlchemyError:
        db_session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error has occurred",
        )


@api_router.get("/me/courses", response_model=list[CourseResponse])
def get_self_course(db_session: SessionDep, current_user: TeacherDep):
    """
    Get all own course details.
    """
    teacher = db_session.exec(
        select(Teacher).where(Teacher.user_id == current_user.id)
    ).first()
    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"teacher id not found"
        )
    course = db_session.exec(
        select(Course).where(Course.teacher_id == current_user.teacher.phone_no)
    ).all()
    return course


@api_router.get("/{id}/courses", response_model=list[CoursePublicResponse])
def get_teacher_course(id: uuid.UUID, db_session: SessionDep, current_user: LoginDep):
    """
    Get all courses added by specific teachers by ID.
    """
    teacher = db_session.exec(select(Teacher).where(Teacher.user_id == id)).first()
    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"teacher id not found"
        )
    course = db_session.exec(
        select(Course).where(Course.teacher_id == teacher.phone_no)
    ).all()
    return course


@api_router.patch("/me/courses/{id}", response_model=CourseResponse)
def update_self_course(
    id: uuid.UUID,
    coursedata: CourseUpdate,
    db_session: SessionDep,
    current_user: TeacherDep,
):
    """
    Update own course details added by course ID.
    """
    teacher = db_session.exec(
        select(Teacher).where(Teacher.user_id == current_user.id)
    ).first()
    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"teacher id not found"
        )
    course = db_session.exec(
        select(Course)
        .where(Course.teacher_id == current_user.teacher.phone_no)
        .where(Course.id == id)
    ).first()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"course not found"
        )
    course.sqlmodel_update(coursedata.model_dump(exclude_unset=True))
    try:
        db_session.add(course)
        db_session.commit()
        db_session.refresh(course)
        return course
    except SQLAlchemyError:
        db_session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error has occurred",
        )


@api_router.delete("/me/courses/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_self_course(id: uuid.UUID, db_session: SessionDep, current_user: TeacherDep):
    """
    Delete own course by ID.
    """
    teacher = db_session.exec(
        select(Teacher).where(Teacher.user_id == current_user.id)
    ).first()
    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"teacher id not found"
        )
    course = db_session.exec(
        select(Course)
        .where(Course.teacher_id == current_user.teacher.phone_no)
        .where(Course.id == id)
    ).first()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"course not found"
        )
    db_session.delete(course)
    db_session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@api_router.get("/", response_model=list[TeacherResponse])
def get_teachers(current_user: AdminDep, db_session: SessionDep):
    """
    Get all teachers details (admin access).
    """
    return db_session.exec(select(Teacher)).all()


@api_router.get("/{id}", response_model=TeacherResponse)
def get_teacher(id: uuid.UUID, db_session: SessionDep, current_user: AdminDep):
    """
    Get single teacher details by ID (admin access).
    """
    teacher = db_session.exec(select(Teacher).where(Teacher.user_id == id)).first()
    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"user id not found",
        )
    return teacher


@api_router.patch("/{id}", response_model=TeacherResponse)
def update_teacher(
    id: uuid.UUID,
    teacherdata: TeacherUpdate,
    db_session: SessionDep,
    current_user: AdminDep,
):
    """
    Update a specific teacher details by ID (admin access).
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
    try:
        db_session.add(teacher)
        db_session.commit()
        db_session.refresh(teacher)
        return teacher
    except SQLAlchemyError:
        db_session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error has occurred",
        )
