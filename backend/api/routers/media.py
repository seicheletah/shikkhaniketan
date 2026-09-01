import uuid
from fastapi import status, HTTPException, APIRouter
from backend.core.database import SessionDep
from backend.core.security import LoginDep, TeacherDep
from backend.utils import (
    generate_upload_presigned_url,
    generate_stream_presigned_url,
)
from backend.models import (
    Teacher,
    Course,
    Enrollment,
    Media,
    MediaUpload,
    MediaUploadPresigned,
    MediaAccessPresigned,
)
from sqlmodel import select
from sqlalchemy.exc import SQLAlchemyError

api_router = APIRouter(prefix="/courses", tags=["Media"])


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
    """
    Upload a thumbnail to AWS S3 by course ID.
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
        .where(Course.id == id)
        .where(Course.teacher_id == current_user.teacher.phone_no)
    ).first()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail=f"access denied"
        )
    s3_thumbnail_key = f"media/{current_user.teacher.user_id}/course/{id}/{mediadata.file_name}.{mediadata.file_extension.value}"
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
    """
    Upload resource (video or document) to AWS S3 by course ID.
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
        .where(Course.id == id)
        .where(Course.teacher_id == current_user.teacher.phone_no)
    ).first()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail=f"access denied"
        )
    s3_resource_key = f"media/{current_user.teacher.user_id}/course/{id}/{mediadata.file_name}.{mediadata.file_extension.value}"
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


@api_router.post("/{course_id}/media/{id}/status")
def media_upload_status(
    id: uuid.UUID,
    course_id: uuid.UUID,
    db_session: SessionDep,
    current_user: TeacherDep,
):
    """
    Update media (thumbnail or resource) upload status to 'ready'.
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


@api_router.get(
    "/{id}/media/thumbnail/access",
    response_model=MediaAccessPresigned,
)
def access_course_media_thumbnail(
    id: uuid.UUID,
    db_session: SessionDep,
):
    """
    Access course thumbnail from AWS S3 by ID.
    """
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


@api_router.get(
    "/{id}/media/resource/access",
    response_model=MediaAccessPresigned,
)
def access_course_media_resource(
    id: uuid.UUID,
    db_session: SessionDep,
    current_user: LoginDep,
):
    """
    Access course resource (video or document) from AWS S3 by ID.
    """
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
