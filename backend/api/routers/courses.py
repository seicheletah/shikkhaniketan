import uuid
from fastapi import status, HTTPException, APIRouter, Response, Query
from backend.core.database import SessionDep
from backend.core.security import TeacherDep, AdminDep
from backend.models import (
    Teacher,
    Course,
    CourseCreate,
    CourseResponse,
    CoursePublicResponse,
    CourseUpdate,
    CourseTags,
    CourseLanguage,
    CourseResourceType,
)
from sqlmodel import select, col, func
from sqlalchemy.exc import SQLAlchemyError
from typing import Annotated

api_router = APIRouter(prefix="/courses", tags=["Courses"])


@api_router.post(
    "/", status_code=status.HTTP_201_CREATED, response_model=CourseResponse
)
def create_course(
    coursedata: CourseCreate, db_session: SessionDep, current_user: TeacherDep
):
    """
    Create a course.
    """
    teacher = db_session.exec(
        select(Teacher).where(Teacher.user_id == current_user.id)
    ).first()
    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"teacher id not found"
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


@api_router.get("/search", response_model=list[CoursePublicResponse])
def search_courses(
    db_session: SessionDep,
    name: str | None = None,
    tags: Annotated[list[CourseTags] | None, Query()] = None,
    language: CourseLanguage | None = None,
    paid: bool | None = None,
    type: CourseResourceType | None = None,
    limit: int | None = None,
    offset: int | None = None,
):
    """
    Search courses using query parameters.
    """
    statement = select(Course)
    if name:
        statement = statement.where(
            col(Course.search_vector).op("@@")(
                func.websearch_to_tsquery("english", name)
            )
        )
    if tags:
        statement = statement.where(col(Course.course_tags).op("@>")(tags))
    if language:
        statement = statement.where(Course.course_language == language)
    if paid:
        statement = statement.where(Course.course_paid == paid)
    if type:
        statement = statement.where(Course.course_resource_type == type)
    if offset is not None:
        statement = statement.offset(offset)
    if limit is not None:
        statement = statement.limit(limit)

    try:
        course = db_session.exec(statement).all()
    except SQLAlchemyError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error has occurred",
        )
    return course


@api_router.get("/{id}", response_model=CoursePublicResponse)
def get_course(id: uuid.UUID, db_session: SessionDep):
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


@api_router.get("/", response_model=list[CoursePublicResponse])
def get_courses(
    db_session: SessionDep,
    limit: int | None = None,
    offset: int | None = None,
):
    """
    Get all existing courses details.
    """
    return db_session.exec(select(Course).offset(offset).limit(limit)).all()


@api_router.patch("/{id}", response_model=CourseResponse)
def update_course(
    id: uuid.UUID,
    coursedata: CourseUpdate,
    db_session: SessionDep,
    current_user: AdminDep,
):
    """
    Update a course details with ID.  (admin access)
    """
    course = db_session.get(Course, id)
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


@api_router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_course(id: uuid.UUID, db_session: SessionDep, current_user: AdminDep):
    """
    Delete a course by ID (admin access).
    """
    course = db_session.get(Course, id)
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"course not found"
        )
    db_session.delete(course)
    db_session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
