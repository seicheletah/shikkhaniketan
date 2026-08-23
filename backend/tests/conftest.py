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


# fixture for user account creation
@pytest.fixture(name="user_account")
def user_account_create(client):
    def _user_account_create(data):
        response = client.post(
            f"{settings.API_V1_STR}/users",
            json=data,
        )
        return response

    return _user_account_create


# fixture for user account login
@pytest.fixture(name="user_login")
def user_login(client, user_account):
    def _user_login(create_user_account, user_login_data):
        account_response = user_account(create_user_account)
        login_response = client.post(
            f"{settings.API_V1_STR}/login",
            data=user_login_data,
        )
        return {
            "account_response": account_response,
            "token": login_response.json()["access_token"],
        }

    return _user_login


# fixture for student profile creation
@pytest.fixture(name="student_profile")
def student_profile(client, user_login):
    def _student_profile(create_user_account, user_login_data, profile_data):
        login_response = user_login(create_user_account, user_login_data)
        profile_response = client.post(
            f"{settings.API_V1_STR}/students",
            json=profile_data,
            headers={"Authorization": f"Bearer {login_response["token"]}"},
        )
        login_response["profile_response"] = profile_response
        return login_response

    return _student_profile


# fixture for teacher profile creation
@pytest.fixture(name="teacher_profile")
def teacher_profile(client, user_login):
    def _teacher_profile(create_user_account, user_login_data, profile_data):
        login_response = user_login(create_user_account, user_login_data)
        profile_response = client.post(
            f"{settings.API_V1_STR}/teachers",
            json=profile_data,
            headers={"Authorization": f"Bearer {login_response["token"]}"},
        )
        login_response["profile_response"] = profile_response
        return login_response

    return _teacher_profile
