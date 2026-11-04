import secrets
import string
from fastapi import Response, status, HTTPException, APIRouter, BackgroundTasks
from backend.core.database import SessionDep
from backend.core.security import get_password_hash, LoginDep
from backend.core.config import settings
from backend.utils import send_otp
from backend.models import (
    User,
    UserCreate,
    UserResponse,
    UserUpdate,
    UserOtp,
    UserVerifyEmail,
    AdminUser,
    GenericMessage,
)
from sqlmodel import select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from datetime import datetime, timedelta, timezone

api_router = APIRouter(prefix="/users", tags=["Users"])


@api_router.post("/", status_code=status.HTTP_201_CREATED, response_model=UserResponse)
async def create_user(
    userdata: UserCreate, db_session: SessionDep, background_tasks: BackgroundTasks
):
    """
    Create an user. It also sends email OTP.
    """
    existing_admin_user_email_id = db_session.exec(
        select(AdminUser).where(AdminUser.email_id == userdata.email_id)
    ).first()
    if existing_admin_user_email_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail=f"access denied"
        )
    existing_user_email_id = db_session.exec(
        select(User).where(User.email_id == userdata.email_id)
    ).first()
    try:
        if existing_user_email_id:
            if existing_user_email_id.is_verified:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"email id already exists",
                )
            else:
                db_session.delete(existing_user_email_id)
                db_session.commit()
        userdata.hashed_password = get_password_hash(userdata.hashed_password)
        user = User(**userdata.model_dump())
        db_session.add(user)
        db_session.flush()
        code = "".join(secrets.choice(string.digits) for _ in range(6))
        expiration = datetime.now(timezone.utc) + timedelta(
            minutes=settings.OTP_EXPIRE_MINUTES
        )
        otp = UserOtp(user_id=user.id, code=code, expires_at=expiration)
        db_session.add(otp)
        db_session.commit()
        db_session.refresh(user)
        background_tasks.add_task(send_otp, user.email_id, code)
        return user
    except SQLAlchemyError:
        db_session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error has occurred",
        )


@api_router.post("/verify-email", response_model=GenericMessage)
def verify_user_email(userdata: UserVerifyEmail, db_session: SessionDep):
    """
    verify an user email with OTP.
    """
    otp = db_session.exec(
        select(UserOtp)
        .where(UserOtp.user_id == userdata.user_id)
        .where(UserOtp.code == userdata.code)
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
        user = db_session.get(User, userdata.user_id)
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


@api_router.get("/me", response_model=UserResponse)
def get_self(db_session: SessionDep, current_user: LoginDep):
    """
    Get own user details.
    """
    user = db_session.get(User, current_user.id)
    return user


@api_router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_self(db_session: SessionDep, current_user: LoginDep):
    """
    Delete own user.
    """
    user = db_session.get(User, current_user.id)
    db_session.delete(user)
    db_session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@api_router.patch("/me", response_model=UserResponse)
def update_self(userdata: UserUpdate, db_session: SessionDep, current_user: LoginDep):
    """
    Update own user details.
    """
    user = db_session.get(User, current_user.id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"user id not found"
        )
    if userdata.hashed_password:
        userdata.hashed_password = get_password_hash(userdata.hashed_password)
    user.sqlmodel_update(userdata.model_dump(exclude_unset=True))
    try:
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        return user
    except IntegrityError:
        db_session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="email id already exists",
        )
    except SQLAlchemyError:
        db_session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error has occurred",
        )
