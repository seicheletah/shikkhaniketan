from fastapi import Response, status, HTTPException, APIRouter
from backend.core.database import SessionDep
from backend.core.security import get_password_hash, LoginDep, AdminDep
from backend.models import User, UserCreate, UserResponse, UserUpdate
from sqlmodel import select
from sqlalchemy.exc import IntegrityError

api_router = APIRouter(prefix="/users", tags=["Users"])


# get users
@api_router.get("/", response_model=list[UserResponse])
def get_users(current_user: AdminDep, db_session: SessionDep):
    return db_session.exec(select(User)).all()


# get single user with id
@api_router.get("/{id}", response_model=UserResponse)
def get_user(id: int, db_session: SessionDep, current_user: AdminDep):
    data = db_session.get(User, id)
    if not data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"user id not found",
        )
    return data


# create user
@api_router.post("/", status_code=status.HTTP_201_CREATED, response_model=UserResponse)
def create_user(userdata: UserCreate, db_session: SessionDep):
    userdata.hashed_password = get_password_hash(userdata.hashed_password)
    user = User(**userdata.model_dump())
    try:
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        return user
    except IntegrityError:
        db_session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="email id already exists.",
        )


# delete user
@api_router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(id: int, db_session: SessionDep, current_user: LoginDep):
    if id == current_user.id or current_user.role == "admin":
        if current_user.role == "admin":
            user = db_session.get(User, id)
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, detail=f"user id not found"
                )
            current_user = user
        db_session.delete(current_user)
        db_session.commit()
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"access denied",
        )


# update user
@api_router.patch("/{id}", response_model=UserResponse)
def update_user(
    id: int, userdata: UserUpdate, db_session: SessionDep, current_user: LoginDep
):
    if id == current_user.id or current_user.role == "admin":
        if current_user.role == "admin":
            user = db_session.get(User, id)
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, detail=f"user id not found"
                )
            current_user = user
        if userdata.hashed_password:
            userdata.hashed_password = get_password_hash(userdata.hashed_password)
        current_user.sqlmodel_update(userdata.model_dump(exclude_unset=True))
        try:
            db_session.add(current_user)
            db_session.commit()
            db_session.refresh(current_user)
            return current_user
        except IntegrityError:
            db_session.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="email id already exists.",
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"access denied",
        )
