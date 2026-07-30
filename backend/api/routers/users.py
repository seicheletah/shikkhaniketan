from fastapi import Response, status, HTTPException, APIRouter, Depends
from backend.core.database import get_session
from backend.core.security import get_password_hash
from backend.models import User, UserCreate, UserResponse, UserUpdate
from sqlmodel import Session, select
from sqlalchemy.exc import IntegrityError

api_router = APIRouter(prefix="/users", tags=["Users"])


# get users
@api_router.get("/", response_model=list[UserResponse])
def get_users(db_session: Session = Depends(get_session)):
    return db_session.exec(select(User)).all()


# get single user with id
@api_router.get("/{id}", response_model=UserResponse)
def get_user(id: int, db_session: Session = Depends(get_session)):
    data = db_session.get(User, id)
    if not data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"user with id: {id} was not found",
        )
    return data


# create user
@api_router.post("/", status_code=status.HTTP_201_CREATED, response_model=UserResponse)
def create_user(userdata: UserCreate, db_session: Session = Depends(get_session)):
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
            detail="email address already exists.",
        )


# delete user
@api_router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(id: int, db_session: Session = Depends(get_session)):
    data = db_session.get(User, id)
    if not data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    db_session.delete(data)
    db_session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# update user
@api_router.patch("/{id}", response_model=UserResponse)
def update_user(
    id: int, userdata: UserUpdate, db_session: Session = Depends(get_session)
):
    data = db_session.get(User, id)
    if not data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    data.sqlmodel_update(userdata.model_dump(exclude_unset=True))
    db_session.add(data)
    db_session.commit()
    db_session.refresh(data)
    return data
