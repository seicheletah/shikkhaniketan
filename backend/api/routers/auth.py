from fastapi import APIRouter, Depends
from backend.models import User, Token, AdminUser
from backend.core.security import authenticate_user
from backend.core.database import SessionDep
from typing import Annotated
from fastapi.security import OAuth2PasswordRequestForm

api_router = APIRouter(tags=["Authentication"])


@api_router.post("/login", response_model=Token)
def login(
    logindata: Annotated[OAuth2PasswordRequestForm, Depends()], db_session: SessionDep
):
    """
    Authenticate a user account with username and password.
    """
    return authenticate_user(logindata, db_session, User)


@api_router.post("/login-admin", response_model=Token)
def login_admin(
    logindata: Annotated[OAuth2PasswordRequestForm, Depends()], db_session: SessionDep
):
    """
    Authenticate a admin user account with username and password.
    """
    return authenticate_user(logindata, db_session, AdminUser)
