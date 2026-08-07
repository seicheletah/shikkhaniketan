from fastapi import status, HTTPException, APIRouter
from backend.core.database import SessionDep
from backend.core.security import LoginDep, AdminDep
from backend.models import Student, StudentResponse, StudentCreate, StudentUpdate
from sqlmodel import select
from sqlalchemy.exc import SQLAlchemyError

api_router = APIRouter(prefix="/students", tags=["Students"])


# create student
@api_router.post(
    "/", status_code=status.HTTP_201_CREATED, response_model=StudentResponse
)
def create_student(
    userdata: StudentCreate, db_session: SessionDep, current_user: LoginDep
):
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
