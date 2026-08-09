from fastapi import status, HTTPException, APIRouter, Response
from backend.core.database import SessionDep
from backend.core.security import TeacherDep, AdminDep
from backend.models import (
    Teacher,
    Course,
    CourseCreate,
    CourseResponse,
    CoursePublicResponse,
    CourseUpdate,
)
from sqlmodel import select, col
from sqlalchemy.exc import SQLAlchemyError

api_router = APIRouter(prefix="/courses", tags=["Courses"])


# create course
@api_router.post(
    "/", status_code=status.HTTP_201_CREATED, response_model=CourseResponse
)
def create_course(
    coursedata: CourseCreate, db_session: SessionDep, current_user: TeacherDep
):
    teacher = db_session.exec(
        select(Teacher).where(Teacher.user_id == current_user.id)
    ).first()
    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"teacher id not found"
        )
    # remove thumbnail and file duplicate search logic if database becomes slow
    thumbnail = db_session.exec(
        select(Course).where(Course.course_thumbnail == coursedata.course_thumbnail)
    ).first()
    if thumbnail:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="thumbnail url already exists",
        )
    file = db_session.exec(
        select(Course).where(Course.course_file == coursedata.course_file)
    ).first()
    if file:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="file url already exists",
        )
    course = Course(teacher_id=current_user.teacher.phone_no, **coursedata.model_dump())
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


# search courses
@api_router.get("/search", response_model=list[CoursePublicResponse])
def search_courses(db_session: SessionDep, q: str, limit: int = 5, offset: int = 0):
    course = db_session.exec(
        select(Course)
        .where(col(Course.course_name).ilike(f"%{q.strip()}%"))
        .offset(offset)
        .limit(limit)
    ).all()
    return course


# get single course with id
@api_router.get("/{id}", response_model=CoursePublicResponse)
def get_course(id: int, db_session: SessionDep):
    course = db_session.get(Course, id)
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"course not found",
        )
    return course


# get all courses (admin access)
@api_router.get("/", response_model=list[CourseResponse])
def get_courses(current_user: AdminDep, db_session: SessionDep):
    return db_session.exec(select(Course)).all()


# update course (admin access)
@api_router.patch("/{id}", response_model=CourseResponse)
def update_course(
    id: int, coursedata: CourseUpdate, db_session: SessionDep, current_user: AdminDep
):
    course = db_session.get(Course, id)
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"course not found"
        )
    # remove thumbnail and file duplicate search logic if database becomes slow
    if coursedata.course_thumbnail:
        thumbnail = db_session.exec(
            select(Course).where(Course.course_thumbnail == coursedata.course_thumbnail)
        ).first()
        if thumbnail:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="thumbnail url already exists",
            )
    if coursedata.course_file:
        file = db_session.exec(
            select(Course).where(Course.course_file == coursedata.course_file)
        ).first()
        if file:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="file url already exists",
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


# delete course (admin access)
@api_router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_course(id: int, db_session: SessionDep, current_user: AdminDep):
    course = db_session.get(Course, id)
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"course not found"
        )
    db_session.delete(course)
    db_session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
