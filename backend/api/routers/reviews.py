import uuid
from fastapi import status, HTTPException, APIRouter
from backend.core.database import SessionDep
from backend.core.security import LoginDep, StudentDep
from backend.models import (
    Student,
    Course,
    Enrollment,
    Review,
    ReviewCreate,
    ReviewResponse,
    ReviewPublicResponse,
    RatingPublicResponse,
)
from sqlmodel import select, func, col
from sqlalchemy.exc import SQLAlchemyError

api_router = APIRouter(prefix="/courses", tags=["Courses"])


# create review on speciic course
@api_router.post(
    "/{id}/review",
    status_code=status.HTTP_201_CREATED,
    response_model=ReviewResponse,
)
def create_review(
    id: uuid.UUID,
    reviewdata: ReviewCreate,
    db_session: SessionDep,
    current_user: StudentDep,
):
    course = db_session.get(Course, id)
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"course not found"
        )
    enrollment = db_session.exec(
        select(Enrollment)
        .where(Enrollment.student_id == current_user.student.phone_no)
        .where(Enrollment.course_id == id)
    ).first()
    if not enrollment:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail=f"access denied"
        )
    existing_review = db_session.exec(
        select(Review)
        .where(Review.student_id == current_user.student.phone_no)
        .where(Review.course_id == id)
    ).first()
    if existing_review:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail=f"review already exist"
        )
    review = Review(
        student_id=current_user.student.phone_no,
        course_id=id,
        **reviewdata.model_dump(),
    )
    try:
        db_session.add(review)
        db_session.commit()
        db_session.refresh(review)
        return review
    except SQLAlchemyError:
        db_session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error has occurred",
        )


#  get all reviews on specific course
@api_router.get("/{id}/review", response_model=list[ReviewPublicResponse])
def get_review(
    id: uuid.UUID,
    db_session: SessionDep,
    current_user: LoginDep,
):
    course = db_session.get(Course, id)
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"course not found"
        )
    review = db_session.exec(
        select(Review, Student.first_name, Student.last_name)
        .join(Student)
        .where(Review.course_id == id)
    ).all()
    formatted_review = []
    for review, first_name, last_name in review:
        review_dict = review.model_dump()
        review_dict["first_name"] = first_name
        review_dict["last_name"] = last_name
        formatted_review.append(review_dict)
    return formatted_review


# get rating on specific course
@api_router.get("/{id}/rating", response_model=RatingPublicResponse)
def get_rating(
    id: uuid.UUID,
    db_session: SessionDep,
    current_user: LoginDep,
):
    course = db_session.get(Course, id)
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"course not found"
        )
    rating = db_session.exec(
        select(
            func.count(col(Review.rate)).label("total_reviews"),
            func.avg(col(Review.rate)).label("average_rating"),
        ).where(Review.course_id == id)
    ).first()
    total_reviews = rating[0] if rating and rating[0] else 0
    raw_avg = rating[1] if rating and rating[1] is not None else 0.0
    return RatingPublicResponse(
        course_id=id,
        total_reviews=total_reviews,
        average_rating=round(raw_avg, 1),
    )
