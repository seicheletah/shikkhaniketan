from fastapi import Response, status, HTTPException, APIRouter
from backend.core.database import SessionDep
from backend.core.security import get_password_hash, LoginDep, AdminDep
from backend.models import User, UserCreate, UserResponse, UserUpdate
from sqlmodel import select
from sqlalchemy.exc import IntegrityError

api_router = APIRouter(prefix="/users", tags=["Users"])


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
            detail="email id already exists",
        )


# get self
@api_router.get("/me", response_model=UserResponse)
def get_self(db_session: SessionDep, current_user: LoginDep):
    user = db_session.get(User, current_user.id)
    return user


# delete self
@api_router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_self(db_session: SessionDep, current_user: LoginDep):
    user = db_session.get(User, current_user.id)
    db_session.delete(user)
    db_session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# update self
@api_router.patch("/me", response_model=UserResponse)
def update_self(userdata: UserUpdate, db_session: SessionDep, current_user: LoginDep):
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


# get all users (admin access)
@api_router.get("/", response_model=list[UserResponse])
def get_users(current_user: AdminDep, db_session: SessionDep):
    return db_session.exec(select(User)).all()


# get single user with id (admin access)
@api_router.get("/{id}", response_model=UserResponse)
def get_user(id: int, db_session: SessionDep, current_user: AdminDep):
    user = db_session.get(User, id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"user id not found",
        )
    return user


# delete user (admin access)
@api_router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(id: int, db_session: SessionDep, current_user: AdminDep):
    user = db_session.get(User, id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"user id not found"
        )
    db_session.delete(user)
    db_session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# update user (admin access)
@api_router.patch("/{id}", response_model=UserResponse)
def update_user(
    id: int, userdata: UserUpdate, db_session: SessionDep, current_user: AdminDep
):
    user = db_session.get(User, id)
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
