from fastapi import status, HTTPException, APIRouter
from backend.core.database import SessionDep
from backend.core.security import LoginDep, AdminDep
from backend.models import Student, StudentResponse, StudentUpdate
from sqlmodel import select
from sqlalchemy.exc import IntegrityError

api_router = APIRouter(prefix="/students", tags=["Students"])


# get self
@api_router.get("/me", response_model=StudentResponse)
def get_self(db_session: SessionDep, current_user: LoginDep):
    student = db_session.exec(
        select(Student).where(Student.user_id == current_user.id)
    ).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"student id not found"
        )
    return student


# update self
@api_router.patch("/me", response_model=StudentResponse)
def update_self(
    userdata: StudentUpdate, db_session: SessionDep, current_user: LoginDep
):
    student = db_session.exec(
        select(Student).where(Student.user_id == current_user.id)
    ).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"student id not found"
        )
    student.sqlmodel_update(userdata.model_dump(exclude_unset=True))
    try:
        db_session.add(student)
        db_session.commit()
        db_session.refresh(student)
        return student
    except IntegrityError:
        db_session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="phone number already exists",
        )


# get all students (admin access)
@api_router.get("/", response_model=list[StudentResponse])
def get_students(current_user: AdminDep, db_session: SessionDep):
    return db_session.exec(select(Student)).all()


# get single student with id (admin access)
@api_router.get("/{id}", response_model=StudentResponse)
def get_student(id: int, db_session: SessionDep, current_user: AdminDep):
    student = db_session.exec(select(Student).where(Student.user_id == id)).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"user id not found",
        )
    return student


# update student (admin access)
@api_router.patch("/{id}", response_model=StudentResponse)
def update_student(
    id: int, studentdata: StudentUpdate, db_session: SessionDep, current_user: AdminDep
):
    student = db_session.exec(select(Student).where(Student.user_id == id)).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"student id not found"
        )
    student.sqlmodel_update(studentdata.model_dump(exclude_unset=True))
    try:
        db_session.add(student)
        db_session.commit()
        db_session.refresh(student)
        return student
    except IntegrityError:
        db_session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="phone number already exists",
        )
