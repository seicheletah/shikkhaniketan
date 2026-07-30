from pwdlib import PasswordHash
from sqlmodel import Session, select
from backend.models import User
from fastapi import HTTPException, status

# passwordhash instance
password_hash = PasswordHash.recommended()

# using dummy hash to preventing timing attacks
DUMMY_HASH = password_hash.hash("dummypassword")


# create a hashed password
def get_password_hash(password: str):
    return password_hash.hash(password)


# verify password with hashed one
def verify_password(plain_password: str, hashed_password: str):
    return password_hash.verify(plain_password, hashed_password)


# for authenticating user against db using JWT
def authenticate_user(email_id: str, password: str, db_session: Session):
    data = db_session.exec(select(User).where(User.email_id == email_id)).first()
    if not data:
        verify_password(password, DUMMY_HASH)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"invalid credentials",
        )
    if not verify_password(password, data.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"invalid credentials",
        )
    return data
