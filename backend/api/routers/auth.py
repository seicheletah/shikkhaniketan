from fastapi import APIRouter, Depends
from backend import models
from backend.core.security import authenticate_user
from backend.core.database import get_session
from sqlmodel import Session

api_router = APIRouter(tags=["Authentication"])


# for validating user accounts
@api_router.post("/login", response_model=models.UserResponse)
def login(logindata: models.UserLogin, db_session: Session = Depends(get_session)):
    return authenticate_user(logindata.email_id, logindata.hashed_password, db_session)
