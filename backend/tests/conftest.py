import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from ..main import app
from ..core.config import settings
from ..core.database import get_session
from .sample_test_data import *


# fixture for overriding production database with test db
@pytest.fixture(name="session")
def session_fixture():
    if settings.DATABASE_URL_TEST is not None:
        engine = create_engine(settings.DATABASE_URL_TEST)
        SQLModel.metadata.create_all(engine)
        with Session(engine) as session:
            yield session
        SQLModel.metadata.drop_all(engine)
    else:
        raise ValueError


# fixture for temp test client
@pytest.fixture(name="client")
def client_fixture(session: Session):
    def get_session_override():
        return session

    app.dependency_overrides[get_session] = get_session_override
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


# fixture for student account creation
@pytest.fixture(name="student_account")
def student_account_create(client):
    response = client.post(
        f"{settings.API_V1_STR}/users",
        json=StudentSampleData.request_body_student_creation,
    )
    return response


# fixture for student account login
@pytest.fixture(name="student_login")
def student_login(client, student_account):
    response = client.post(
        f"{settings.API_V1_STR}/login",
        data=StudentSampleData.request_body_student_login,
    )
    return response.json()["access_token"]


# fixture for teacher account creation
@pytest.fixture(name="teacher_account")
def teacher_account_create(client):
    response = client.post(
        f"{settings.API_V1_STR}/users",
        json=TeacherSampleData.request_body_teacher_creation,
    )
    return response


# fixture for teacher account login
@pytest.fixture(name="teacher_login")
def teacher_login(client, teacher_account):
    response = client.post(
        f"{settings.API_V1_STR}/login",
        data=TeacherSampleData.request_body_teacher_login,
    )
    return response.json()["access_token"]
