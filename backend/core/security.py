import jwt
import uuid
from jwt.exceptions import InvalidTokenError
from pwdlib import PasswordHash
from sqlmodel import Session, select
from backend.models import User, Token, TokenData
from fastapi import HTTPException, status, Depends
from datetime import timedelta, datetime, timezone
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from typing import Annotated
from backend.core.database import SessionDep
from backend.core.config import settings

# passwordhash instance
password_hash = PasswordHash.recommended()

# using dummy hash to preventing timing attacks
DUMMY_HASH = password_hash.hash("dummypassword")

# checks request header for token
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/login")


# create a hashed password
def get_password_hash(password: str):
    return password_hash.hash(password)


# verify password with hashed one
def verify_password(plain_password: str, hashed_password: str):
    return password_hash.verify(plain_password, hashed_password)


# create a JWT access token
def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(
        to_encode, settings.SECRET_KEY.get_secret_value(), algorithm=settings.ALGORITHM
    )
    return encoded_jwt


# verify a JWT access token
def verify_access_token(token: str, credentials_exception) -> TokenData:
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY.get_secret_value(),
            algorithms=[settings.ALGORITHM],
        )
        id: uuid.UUID | None = payload.get("id")
        email_id: str | None = payload.get("sub")
        role: str | None = payload.get("role")
        if not id or not email_id or not role:
            raise credentials_exception
        tokendata = TokenData(id=id, email_id=email_id, role=role)
        return tokendata
    except InvalidTokenError:
        raise credentials_exception


# for authorizing user accounts with JWT tokens
def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)], db_session: SessionDep
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    token_data = verify_access_token(token, credentials_exception)
    user = db_session.get(User, token_data.id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"user id not found"
        )
    else:
        return user


# for authorizing admin accounts with JWT tokens
def get_current_admin(current_user: LoginDep) -> User:
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="access denied"
        )
    return current_user


# for authorizing teacher accounts with JWT tokens
# needs refactoring to prevent code repetation
# add checking teacher id exits or not
def get_current_teacher(current_user: LoginDep) -> User:
    if current_user.role != "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="access denied"
        )
    return current_user


# for authorizing student accounts with JWT tokens
# needs refactoring to prevent code repetation
# add checking student id exits or not
def get_current_student(current_user: LoginDep) -> User:
    if current_user.role != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="access denied"
        )
    return current_user


# for authenticating user accounts with password
def authenticate_user(
    logindata: OAuth2PasswordRequestForm, db_session: Session
) -> Token:
    data = db_session.exec(
        select(User).where(User.email_id == logindata.username)
    ).first()
    if not data:
        verify_password(logindata.password, DUMMY_HASH)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"invalid credentials",
        )
    if not verify_password(logindata.password, data.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"invalid credentials",
        )
    access_token = create_access_token(
        data={"sub": logindata.username, "role": data.role, "id": str(data.id)}
    )
    return Token(access_token=access_token, token_type="bearer", role=data.role)


# for reducing code repetition
LoginDep = Annotated[User, Depends(get_current_user)]

AdminDep = Annotated[User, Depends(get_current_admin)]

TeacherDep = Annotated[User, Depends(get_current_teacher)]

StudentDep = Annotated[User, Depends(get_current_student)]
