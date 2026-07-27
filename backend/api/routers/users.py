from fastapi import Response, status, HTTPException
from backend.core.database import db_engine
from backend.models import User, UserResponse, UserUpdate
from sqlmodel import Session, select
from fastapi import APIRouter

api_router = APIRouter(prefix="/users", tags=["users"])


# get users
@api_router.get("/", response_model=list[UserResponse])
def get_users():
    with Session(db_engine) as db_session:
        return db_session.exec(select(User)).all()


# get single user with id
@api_router.get("/{id}", response_model=UserResponse)
def get_user(id: int):
    with Session(db_engine) as db_session:
        data = db_session.get(User, id)
        if not data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"post with id: {id} was not found",
            )
        return data


# create user
@api_router.post("/", status_code=status.HTTP_201_CREATED, response_model=UserResponse)
def create_user(userdata: User):
    with Session(db_engine) as db_session:
        user = User(**userdata.model_dump())
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        return user


# delete user
@api_router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(id: int):
    with Session(db_engine) as db_session:
        data = db_session.get(User, id)
        if not data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
        db_session.delete(data)
        db_session.commit()
        return Response(status_code=status.HTTP_204_NO_CONTENT)


# update user
@api_router.patch("/{id}", response_model=UserResponse)
def update_user(id: int, userdata: UserUpdate):
    with Session(db_engine) as db_session:
        data = db_session.get(User, id)
        if not data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
        data.sqlmodel_update(userdata.model_dump(exclude_unset=True))
        db_session.add(data)
        db_session.commit()
        db_session.refresh(data)
        return data
