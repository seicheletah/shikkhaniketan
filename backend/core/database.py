import os
from sqlmodel import create_engine, SQLModel, Session
import backend.models
from dotenv import load_dotenv
from typing import Annotated
from fastapi import Depends

load_dotenv()

# for creating db engine
db_engine = create_engine(f"postgresql+psycopg://{os.getenv("DATABASE_URL")}")


# for creaing session objects with Depends()
def get_session():
    with Session(db_engine) as session:
        yield session


# for reducing code repetition
SessionDep = Annotated[Session, Depends(get_session)]

try:
    SQLModel.metadata.create_all(db_engine)
except:
    pass
