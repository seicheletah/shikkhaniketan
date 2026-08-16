from sqlmodel import create_engine, SQLModel, Session
import backend.models
from typing import Annotated
from fastapi import Depends
from backend.core.config import settings

# for creating db engine
db_engine = create_engine(settings.DATABASE_URL_DEV)


# for creaing session objects with Depends()
def get_session():
    with Session(db_engine) as session:
        yield session


# for reducing code repetition
SessionDep = Annotated[Session, Depends(get_session)]
