import uuid
from fastapi import status, HTTPException, APIRouter, Response
from backend.core.database import SessionDep
from backend.core.security import AdminDep, StudentDep
from backend.models import (
    Student,
    StudentResponse,
    StudentCreate,
    StudentUpdate,
    ReviewUpdate,
    ReviewResponse,
    Course,
    Review,
)
from sqlmodel import select
from sqlalchemy.exc import SQLAlchemyError

api_router = APIRouter(prefix="/students", tags=["Students"])


@api_router.post(
    "/", status_code=status.HTTP_201_CREATED, response_model=StudentResponse
)
def create_student(
    userdata: StudentCreate, db_session: SessionDep, current_user: StudentDep
):
    """
    Create student.
    """
    if current_user.id is not None:
        student = db_session.exec(
            select(Student).where(Student.user_id == current_user.id)
        ).first()
        if student:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="student profile already exists",
            )
        phone_no = db_session.exec(
            select(Student).where(Student.phone_no == userdata.phone_no)
        ).first()
        if phone_no:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="phone number already exists",
            )
        student = Student(user_id=current_user.id, **userdata.model_dump())
        try:
            db_session.add(student)
            db_session.commit()
            db_session.refresh(student)
            return student
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


@api_router.get("/me", response_model=StudentResponse)
def get_self(db_session: SessionDep, current_user: StudentDep):
    """
    Get own details.
    """
    student = db_session.exec(
        select(Student).where(Student.user_id == current_user.id)
    ).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"student id not found"
        )
    return student


@api_router.patch("/me", response_model=StudentResponse)
def update_self(
    userdata: StudentUpdate, db_session: SessionDep, current_user: StudentDep
):
    """
    Update own details.
    """
    student = db_session.exec(
        select(Student).where(Student.user_id == current_user.id)
    ).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"student id not found"
        )
    if userdata.phone_no:
        phone_no = db_session.exec(
            select(Student).where(Student.phone_no == userdata.phone_no)
        ).first()
        if phone_no:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="phone number already exists",
            )
    student.sqlmodel_update(userdata.model_dump(exclude_unset=True))
    try:
        db_session.add(student)
        db_session.commit()
        db_session.refresh(student)
        return student
    except SQLAlchemyError:
        db_session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error has occurred",
        )


@api_router.patch("/me/courses/{id}/review", response_model=ReviewResponse)
def update_self_review(
    id: uuid.UUID,
    reviewdata: ReviewUpdate,
    db_session: SessionDep,
    current_user: StudentDep,
):
    """
    Update own review done to a course by ID.
    """
    course = db_session.get(Course, id)
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"course not found"
        )
    existing_review = db_session.exec(
        select(Review)
        .where(Review.course_id == id)
        .where(Review.student_id == current_user.student.phone_no)
    ).first()
    if not existing_review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"review not found",
        )
    existing_review.sqlmodel_update(reviewdata.model_dump(exclude_unset=True))
    try:
        db_session.add(existing_review)
        db_session.commit()
        db_session.refresh(existing_review)
        return existing_review
    except SQLAlchemyError:
        db_session.rollback()
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="An unexpected error has occurred",
    )


@api_router.delete("/me/courses/{id}/review", status_code=status.HTTP_204_NO_CONTENT)
def delete_self_review(
    id: uuid.UUID,
    db_session: SessionDep,
    current_user: StudentDep,
):
    """
    Delete own review done to a course by ID.
    """
    course = db_session.get(Course, id)
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"course not found"
        )
    existing_review = db_session.exec(
        select(Review)
        .where(Review.course_id == id)
        .where(Review.student_id == current_user.student.phone_no)
    ).first()
    if not existing_review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"review not found",
        )
    db_session.delete(existing_review)
    db_session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@api_router.get("/", response_model=list[StudentResponse])
def get_students(current_user: AdminDep, db_session: SessionDep):
    """
    Get all student details (admin access).
    """
    return db_session.exec(select(Student)).all()


@api_router.get("/{id}", response_model=StudentResponse)
def get_student(id: uuid.UUID, db_session: SessionDep, current_user: AdminDep):
    """
    Get a specific student details by ID (admin access).
    """
    student = db_session.exec(select(Student).where(Student.user_id == id)).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"user id not found",
        )
    return student


@api_router.patch("/{id}", response_model=StudentResponse)
def update_student(
    id: uuid.UUID,
    studentdata: StudentUpdate,
    db_session: SessionDep,
    current_user: AdminDep,
):
    """
    Update student details by ID (admin access).
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
    try:
        db_session.add(student)
        db_session.commit()
        db_session.refresh(student)
        return student
    except SQLAlchemyError:
        db_session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error has occurred",
        )
