from fastapi import status, HTTPException, APIRouter, Response
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
)
from sqlmodel import select
from sqlalchemy.exc import SQLAlchemyError

api_router = APIRouter(prefix="/teachers", tags=["Teachers"])


# create teacher
@api_router.post(
    "/", status_code=status.HTTP_201_CREATED, response_model=TeacherResponse
)
def create_teacher(
    userdata: TeacherCreate, db_session: SessionDep, current_user: TeacherDep
):
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


# get self
@api_router.get("/me", response_model=TeacherResponse)
def get_self(db_session: SessionDep, current_user: TeacherDep):
    teacher = db_session.exec(
        select(Teacher).where(Teacher.user_id == current_user.id)
    ).first()
    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"teacher id not found"
        )
    return teacher


# update self
@api_router.patch("/me", response_model=TeacherResponse)
def update_self(
    userdata: TeacherUpdate, db_session: SessionDep, current_user: TeacherDep
):
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


# get all self courses
@api_router.get("/me/courses", response_model=list[CourseResponse])
def get_self_course(db_session: SessionDep, current_user: TeacherDep):
    course = db_session.exec(
        select(Course).where(Course.teacher_id == current_user.teacher.phone_no)
    ).all()
    return course


# get all courses of specific teachers
@api_router.get("/{id}/courses", response_model=list[CoursePublicResponse])
def get_teacher_course(id: int, db_session: SessionDep, current_user: LoginDep):
    teacher = db_session.exec(select(Teacher).where(Teacher.user_id == id)).first()
    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"teacher id not found"
        )
    course = db_session.exec(
        select(Course).where(Course.teacher_id == teacher.phone_no)
    ).all()
    return course


# update self course
@api_router.patch("/me/courses/{id}", response_model=CourseResponse)
def update_self_course(
    id: int, coursedata: CourseUpdate, db_session: SessionDep, current_user: TeacherDep
):
    course = db_session.exec(
        select(Course)
        .where(Course.teacher_id == current_user.teacher.phone_no)
        .where(Course.id == id)
    ).first()
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


# delete self course
@api_router.delete("/me/courses/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_self_course(id: int, db_session: SessionDep, current_user: TeacherDep):
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


# get all teachers (admin access)
@api_router.get("/", response_model=list[TeacherResponse])
def get_teachers(current_user: AdminDep, db_session: SessionDep):
    return db_session.exec(select(Teacher)).all()


# get single teacher with id (admin access)
@api_router.get("/{id}", response_model=TeacherResponse)
def get_teacher(id: int, db_session: SessionDep, current_user: AdminDep):
    teacher = db_session.exec(select(Teacher).where(Teacher.user_id == id)).first()
    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"user id not found",
        )
    return teacher


# update teacher (admin access)
@api_router.patch("/{id}", response_model=TeacherResponse)
def update_teacher(
    id: int, teacherdata: TeacherUpdate, db_session: SessionDep, current_user: AdminDep
):
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
