import uuid
import razorpay
from fastapi import status, HTTPException, APIRouter, Response
from backend.core.database import SessionDep
from backend.core.security import LoginDep, StudentDep, TeacherDep, AdminDep
from backend.core.config import settings
from backend.utils import (
    razorpay_client,
    generate_upload_presigned_url,
    generate_stream_presigned_url,
)
from backend.models import (
    Student,
    Teacher,
    Course,
    CourseCreate,
    CourseResponse,
    CoursePublicResponse,
    CourseUpdate,
    Enrollment,
    Purchase,
    PurchaseOrderResponse,
    PurchaseVerify,
    Media,
    MediaUpload,
    MediaUploadPresigned,
    MediaAccessPresigned,
)
from sqlmodel import select, col
from sqlalchemy.exc import SQLAlchemyError
from datetime import datetime, timezone

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
def get_course(id: uuid.UUID, db_session: SessionDep):
    course = db_session.get(Course, id)
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"course not found",
        )
    return course


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


# for uploading course media thumbnail to s3
@api_router.post(
    "/{id}/media/thumbnail/upload",
    status_code=status.HTTP_201_CREATED,
    response_model=MediaUploadPresigned,
)
def upload_course_media_thumbnail(
    id: uuid.UUID,
    mediadata: MediaUpload,
    db_session: SessionDep,
    current_user: TeacherDep,
):
    teacher = db_session.exec(
        select(Teacher).where(Teacher.user_id == current_user.id)
    ).first()
    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"teacher id not found"
        )
    course = db_session.exec(
        select(Course)
        .where(Course.id == id)
        .where(Course.teacher_id == current_user.teacher.phone_no)
    ).first()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail=f"access denied"
        )
    s3_thumbnail_key = f"media/{current_user.teacher.user_id}/course/{id}/{mediadata.file_name}.{mediadata.file_extension}"
    existing_thumbnail = db_session.exec(
        select(Media).where(Media.category == "thumbnail").where(Media.course_id == id)
    ).first()
    if existing_thumbnail:
        db_session.delete(existing_thumbnail)
        db_session.commit()
    media_thumbnail_id = uuid.uuid7()
    media_thumbnail = Media(
        id=media_thumbnail_id,
        s3_key=s3_thumbnail_key,
        course_id=id,
        **mediadata.model_dump(),
    )
    try:
        db_session.add(media_thumbnail)
        db_session.commit()
    except SQLAlchemyError:
        db_session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error has occurred",
        )
    media_thumbnail_presigned = generate_upload_presigned_url(s3_thumbnail_key)
    return {
        "media_id": media_thumbnail_id,
        "upload_url": media_thumbnail_presigned,
    }


# for uploading course media resource to s3
@api_router.post(
    "/{id}/media/resource/upload",
    status_code=status.HTTP_201_CREATED,
    response_model=MediaUploadPresigned,
)
def upload_course_media_resource(
    id: uuid.UUID,
    mediadata: MediaUpload,
    db_session: SessionDep,
    current_user: TeacherDep,
):
    teacher = db_session.exec(
        select(Teacher).where(Teacher.user_id == current_user.id)
    ).first()
    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"teacher id not found"
        )
    course = db_session.exec(
        select(Course)
        .where(Course.id == id)
        .where(Course.teacher_id == current_user.teacher.phone_no)
    ).first()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail=f"access denied"
        )
    s3_resource_key = f"media/{current_user.teacher.user_id}/course/{id}/{mediadata.file_name}.{mediadata.file_extension}"
    existing_s3_resource_key = db_session.exec(
        select(Media).where(Media.s3_key == s3_resource_key)
    ).first()
    if existing_s3_resource_key:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="resource file already exists",
        )
    media_resource_id = uuid.uuid7()
    media_resource = Media(
        id=media_resource_id,
        s3_key=s3_resource_key,
        course_id=id,
        **mediadata.model_dump(),
    )
    try:
        db_session.add(media_resource)
        db_session.commit()
    except SQLAlchemyError:
        db_session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error has occurred",
        )
    media_resource_presigned = generate_upload_presigned_url(s3_resource_key)
    return {"media_id": media_resource_id, "upload_url": media_resource_presigned}


# for updating media upload status
@api_router.post("/{course_id}/media/{id}/status")
def media_upload_status(
    id: uuid.UUID,
    course_id: uuid.UUID,
    db_session: SessionDep,
    current_user: TeacherDep,
):
    teacher = db_session.exec(
        select(Teacher).where(Teacher.user_id == current_user.id)
    ).first()
    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"teacher id not found"
        )
    course = db_session.exec(
        select(Course)
        .where(Course.id == course_id)
        .where(Course.teacher_id == current_user.teacher.phone_no)
    ).first()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail=f"access denied"
        )

    media = db_session.get(Media, id)
    if not media or media.course_id != course_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="media not found"
        )
    media.status = "ready"
    try:
        db_session.add(media)
        db_session.commit()
        db_session.refresh(media)
    except SQLAlchemyError:
        db_session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error has occurred",
        )
    return {"status": media.status}


# for accessing course media thumbnail from s3
@api_router.get(
    "/{id}/media/thumbnail/access",
    response_model=MediaAccessPresigned,
)
def access_course_media_thumbnail(
    id: uuid.UUID,
    db_session: SessionDep,
    current_user: LoginDep,
):
    course = db_session.get(Course, id)
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"course not found"
        )
    media = db_session.exec(
        select(Media)
        .where(Media.course_id == course.id)
        .where(Media.category == "thumbnail")
        .where(Media.status == "ready")
    ).first()
    if not media:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"media not found"
        )
    thumbnail_stream_presigned = generate_stream_presigned_url(media.s3_key)
    return {"course_id": id, "stream_url": thumbnail_stream_presigned}


# for accessing course media resource from s3
@api_router.get(
    "/{id}/media/resource/access",
    response_model=MediaAccessPresigned,
)
def access_course_media_resource(
    id: uuid.UUID,
    db_session: SessionDep,
    current_user: LoginDep,
):
    course = db_session.get(Course, id)
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"course not found"
        )
    if current_user.role == "teacher":
        course = db_session.exec(
            select(Course)
            .where(Course.id == id)
            .where(Course.teacher_id == current_user.teacher.phone_no)
        ).first()
        if not course:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail=f"access denied"
            )
    if current_user.role == "student":
        enrollment = db_session.exec(
            select(Enrollment)
            .where(Enrollment.student_id == current_user.student.phone_no)
            .where(Enrollment.course_id == id)
        ).first()
        if not enrollment:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail=f"access denied"
            )
    media = db_session.exec(
        select(Media)
        .where(Media.course_id == course.id)
        .where(Media.category == "resource")
        .where(Media.status == "ready")
    ).first()
    if not media:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"media not found"
        )
    resource_stream_presigned = generate_stream_presigned_url(media.s3_key)
    return {"course_id": id, "stream_url": resource_stream_presigned}


# get all courses (admin access)
@api_router.get("/", response_model=list[CourseResponse])
def get_courses(current_user: AdminDep, db_session: SessionDep):
    return db_session.exec(select(Course)).all()


# update course (admin access)
@api_router.patch("/{id}", response_model=CourseResponse)
def update_course(
    id: uuid.UUID,
    coursedata: CourseUpdate,
    db_session: SessionDep,
    current_user: AdminDep,
):
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


# delete course (admin access)
@api_router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_course(id: uuid.UUID, db_session: SessionDep, current_user: AdminDep):
    course = db_session.get(Course, id)
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"course not found"
        )
    db_session.delete(course)
    db_session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
