from fastapi import APIRouter, Depends
from backend import models
from backend.core.security import authenticate_user
from backend.core.database import SessionDep
from typing import Annotated
from fastapi.security import OAuth2PasswordRequestForm

api_router = APIRouter(tags=["Authentication"])


# for authenticating user accounts
@api_router.post("/login", response_model=models.Token)
def login(logindata: Annotated[OAuth2PasswordRequestForm, Depends()], db_session: SessionDep):
    return authenticate_user(logindata, db_session)
