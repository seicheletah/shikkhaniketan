import uuid
import razorpay
from fastapi import status, HTTPException, APIRouter
from backend.core.database import SessionDep
from backend.core.security import StudentDep
from backend.core.config import settings
from backend.utils import razorpay_client
from backend.models import (
    Student,
    Course,
    Enrollment,
    Purchase,
    PurchaseOrderResponse,
    PurchaseVerify,
)
from sqlmodel import select
from sqlalchemy.exc import SQLAlchemyError
from datetime import datetime, timezone

api_router = APIRouter(prefix="/courses", tags=["Courses"])


# course purchase order
@api_router.post(
    "/{id}/purchase",
    status_code=status.HTTP_200_OK,
    response_model=PurchaseOrderResponse,
)
def purchase_course(
    id: uuid.UUID,
    db_session: SessionDep,
    current_user: StudentDep,
):
    student = db_session.exec(
        select(Student).where(Student.user_id == current_user.id)
    ).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"student id not found"
        )
    course = db_session.get(Course, id)
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"course not found"
        )
    enrollment = db_session.exec(
        select(Enrollment)
        .where(Enrollment.student_id == student.phone_no)
        .where(Enrollment.course_id == id)
    ).first()
    if enrollment:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="course already purchased",
        )
    order_data = {"amount": int(course.course_price * 100), "currency": "INR"}
    try:
        razorpay_order = razorpay_client.order.create(data=order_data)  # type: ignore
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create payment order: {str(e)}",
        )
    razorpay_order["key_id"] = settings.RAZORPAY_KEY_ID
    purchase = Purchase(
        amount=razorpay_order["amount"],
        razorpay_order_id=razorpay_order["id"],
        student_id=student.phone_no,
        course_id=course.id,
        status=razorpay_order["status"],
        created_at=datetime.fromtimestamp(
            razorpay_order["created_at"], tz=timezone.utc
        ),
    )
    try:
        db_session.add(purchase)
        db_session.commit()
        db_session.refresh(purchase)
    except SQLAlchemyError:
        db_session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error has occurred",
        )
    return razorpay_order


# for verifying payment signature
@api_router.post("/verify-payment", status_code=status.HTTP_200_OK)
def verify_payment(
    data: PurchaseVerify, db_session: SessionDep, current_user: StudentDep
):
    student = db_session.exec(
        select(Student).where(Student.user_id == current_user.id)
    ).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="student id not found"
        )
    verify_data = {
        "razorpay_order_id": data.razorpay_order_id,
        "razorpay_payment_id": data.razorpay_payment_id,
        "razorpay_signature": data.razorpay_signature,
    }
    try:
        razorpay_client.utility.verify_payment_signature(verify_data)  # type: ignore
    except razorpay.errors.SignatureVerificationError:  # type: ignore
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="payment verification failed: invalid signature",
        )
    purchase = db_session.exec(
        select(Purchase).where(Purchase.razorpay_order_id == data.razorpay_order_id)
    ).first()
    if purchase:
        purchase.status = "paid"
        purchase.razorpay_payment_id = data.razorpay_payment_id
        purchase.razorpay_signature = data.razorpay_signature
        db_session.add(purchase)
    enrollment = db_session.get(Enrollment, (student.phone_no, data.course_id))
    if not enrollment:
        enrollment = Enrollment(student_id=student.phone_no, course_id=data.course_id)
        db_session.add(enrollment)
    db_session.commit()
    return {"detail": "success"}
