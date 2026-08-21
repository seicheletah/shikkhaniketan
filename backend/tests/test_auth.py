import pytest
import jwt
from ..core.config import settings
from ..models import Token
from .sample_test_data import *


# login user test success
@pytest.mark.parametrize(
    "request_body_creation, request_body_login",
    [
        (
            StudentSampleData.request_body_student_creation,
            StudentSampleData.request_body_student_login,
        ),
        (
            TeacherSampleData.request_body_teacher_creation,
            TeacherSampleData.request_body_teacher_login,
        ),
    ],
)
def test_login_user_success(client, request_body_creation, request_body_login):
    client.post(f"{settings.API_V1_STR}/users", json=request_body_creation)
    response = client.post(f"{settings.API_V1_STR}/login", data=request_body_login)
    Token(**response.json())
    payload = jwt.decode(
        response.json()["access_token"],
        settings.SECRET_KEY.get_secret_value(),
        algorithms=[settings.ALGORITHM],
    )
    assert response.status_code == 200
    assert payload.get("sub") == request_body_login["username"]
    assert payload.get("role") == request_body_creation["role"]
    assert response.json()["token_type"] == "bearer"


# login user test fail
@pytest.mark.parametrize(
    "request_body_creation, request_body_login",
    [
        (
            StudentSampleData.request_body_student_creation,
            StudentSampleData.request_body_student_login_fail,
        ),
        (
            TeacherSampleData.request_body_teacher_creation,
            TeacherSampleData.request_body_teacher_login_fail,
        ),
    ],
)
def test_login_user_fail(client, request_body_creation, request_body_login):
    client.post(f"{settings.API_V1_STR}/users", json=request_body_creation)
    response = client.post(f"{settings.API_V1_STR}/login", data=request_body_login)
    assert response.status_code == 401
    assert response.json()["detail"] == "invalid credentials"


# login no user test fail
def test_login_nouser_fail(client):
    response = client.post(
        f"{settings.API_V1_STR}/login",
        data=StudentSampleData.request_body_student_login,
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "invalid credentials"


# wrong request body test
def test_login_wrong_request_body(client):
    response = client.post(
        f"{settings.API_V1_STR}/login",
        data=UserSampleData.request_body_wrong_model,
    )
    assert response.json()["detail"][0]["msg"] == "Field required"