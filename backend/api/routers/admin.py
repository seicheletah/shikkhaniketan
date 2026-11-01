import uuid
import secrets
import string
from fastapi import Response, status, HTTPException, APIRouter, BackgroundTasks
from backend.core.database import SessionDep
from backend.core.security import get_password_hash, AdminDep
from backend.core.config import settings
from backend.utils import send_otp
from backend.models import (
    AdminUser,
    AdminUserCreate,
    AdminUserResponse,
    AdminUserUpdate,
    AdminUserOtp,
    AdminAccessToken,
    AdminUserVerifyEmail,
    AdminUserVerifyToken,
    AdminAcessTokenResponse,
    GenericMessage,
)
from sqlmodel import select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from datetime import datetime, timedelta, timezone

api_router = APIRouter(prefix="/admin", tags=["Admin"])


@api_router.post(
    "/", status_code=status.HTTP_201_CREATED, response_model=AdminUserResponse
)
async def create_admin_user(
    userdata: AdminUserCreate, db_session: SessionDep, background_tasks: BackgroundTasks
):
    """
    Create an admin user. It also sends email OTP.
    """
    existing_admin_user_email_id = db_session.exec(
        select(AdminUser).where(AdminUser.email_id == userdata.email_id)
    ).first()
    try:
        if existing_admin_user_email_id:
            if existing_admin_user_email_id.is_verified:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"email id already exists",
                )
            else:
                db_session.delete(existing_admin_user_email_id)
                db_session.commit()
        userdata.hashed_password = get_password_hash(userdata.hashed_password)
        admin_user = AdminUser(**userdata.model_dump())
        db_session.add(admin_user)
        db_session.flush()
        code = "".join(secrets.choice(string.digits) for _ in range(6))
        expiration = datetime.now(timezone.utc) + timedelta(
            minutes=settings.OTP_EXPIRE_MINUTES
        )
        otp = AdminUserOtp(
            admin_user_id=admin_user.id, code=code, expires_at=expiration
        )
        db_session.add(otp)
        db_session.commit()
        db_session.refresh(admin_user)
        background_tasks.add_task(send_otp, admin_user.email_id, code)
        return admin_user
    except SQLAlchemyError:
        db_session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error has occurred",
        )


@api_router.post("/verify-email", response_model=GenericMessage)
def verify_user_email(userdata: AdminUserVerifyEmail, db_session: SessionDep):
    """
    verify an admin user email with OTP.
    """
    otp = db_session.exec(
        select(AdminUserOtp)
        .where(AdminUserOtp.admin_user_id == userdata.user_id)
        .where(AdminUserOtp.code == userdata.code)
    ).first()
    if not otp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="invalid verification code"
        )
    try:
        if otp.expires_at < datetime.now(timezone.utc):
            db_session.delete(otp)
            db_session.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="invalid verification code",
            )
        user = db_session.get(AdminUser, userdata.user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail=f"user id not found"
            )
        user.is_verified = True
        db_session.add(user)
        db_session.delete(otp)
        db_session.commit()
        return {"detail": "account verified"}
    except SQLAlchemyError:
        db_session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error has occurred",
        )


@api_router.post("/verify-token", response_model=GenericMessage)
def verify_admin_user_token(userdata: AdminUserVerifyToken, db_session: SessionDep):
    """
    verify an admin user access token.
    """
    token = db_session.exec(
        select(AdminAccessToken)
        .where(AdminAccessToken.token == userdata.token)
        .where(AdminAccessToken.is_active == True)
    ).first()
    if not token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="invalid token"
        )
    if token.expires_at < datetime.now(timezone.utc):
        token.is_active = False
        try:
            db_session.add(token)
            db_session.commit()
        except SQLAlchemyError:
            db_session.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="invalid token",
        )
    admin_user = db_session.exec(
        select(AdminUser)
        .where(AdminUser.id == userdata.user_id)
        .where(AdminUser.is_verified == True)
        .where(AdminUser.admin_access == False)
    ).first()
    if not admin_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"admin user id not found"
        )
    admin_user.admin_access = True
    token.client_user_id = userdata.user_id
    token.is_active = False
    try:
        db_session.add(admin_user)
        db_session.add(token)
        db_session.commit()
        return {"detail": "admin access granted"}
    except SQLAlchemyError:
        db_session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error has occurred",
        )


@api_router.post("/generate-access-token", response_model=AdminAcessTokenResponse)
def generate_admin_access_token(db_session: SessionDep, current_user: AdminDep):
    """
    Generate a admin access token.
    """
    generated_token = "".join(secrets.choice(string.hexdigits) for _ in range(16))
    expiration = datetime.now(timezone.utc) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    admin_access_token = AdminAccessToken(
        token=generated_token, expires_at=expiration, creator_user_id=current_user.id
    )
    try:
        db_session.add(admin_access_token)
        db_session.commit()
        db_session.refresh(admin_access_token)
        return admin_access_token
    except SQLAlchemyError:
        db_session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error has occurred",
        )
