import os
from sqlmodel import create_engine, SQLModel
import backend.models
from dotenv import load_dotenv

load_dotenv()

# db connection check
db_engine = create_engine(f"postgresql+psycopg://{os.getenv("DATABASE_URL")}")

try:
    SQLModel.metadata.create_all(db_engine)
except:
    pass
