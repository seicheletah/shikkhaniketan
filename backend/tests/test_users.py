import pytest
from ..core.config import settings
from ..models import UserResponse, User
from .sample_test_data import *
from sqlmodel import select


# create user test
@pytest.mark.parametrize(
    "request_body, response_body",
    [
        (
            TeacherSampleData.request_body_teacher_creation,
            TeacherSampleData.response_body_teacher_creation,
        ),
        (
            StudentSampleData.request_body_student_creation,
            StudentSampleData.response_body_student_creation,
        ),
    ],
)
def test_create_user_success(client, request_body, response_body):
    response = client.post(f"{settings.API_V1_STR}/users", json=request_body)
    UserResponse(**response.json())
    assert response.status_code == 201
    assert response.json()["email_id"] == response_body["email_id"]
    assert response.json()["role"] == response_body["role"]
    assert len(response.json()["id"]) == 36


# wrong request body create user test
def test_create_user_wrong_request_body(client):
    response = client.post(
        f"{settings.API_V1_STR}/users",
        json=UserSampleData.request_body_wrong_model,
    )
    assert response.status_code == 422
    assert response.json()["detail"][0]["msg"] == "Field required"


# create admin user fail test
def test_create_admin_fail(client):
    response = client.post(
        f"{settings.API_V1_STR}/users", json=AdminSampleData.request_body_admin_creation
    )
    assert response.status_code == 422
    assert response.json()["detail"][0]["msg"] == "Value error, access denied"


# user email already exists test
def test_user_email_exists(client):
    client.post(
        f"{settings.API_V1_STR}/users",
        json=StudentSampleData.request_body_student_creation,
    )
    response = client.post(
        f"{settings.API_V1_STR}/users",
        json=StudentSampleData.request_body_student_creation,
    )
    assert response.status_code == 409
    assert response.json()["detail"] == "email id already exists"


# get self student data test
def test_get_self_student(client, student_login):
    response = client.get(
        f"{settings.API_V1_STR}/users/me",
        headers={"Authorization": f"Bearer {student_login}"},
    )
    UserResponse(**response.json())
    assert response.status_code == 200
    assert (
        response.json()["email_id"]
        == StudentSampleData.request_body_student_login["username"]
    )
    assert (
        response.json()["role"]
        == StudentSampleData.request_body_student_creation["role"]
    )


# update own student user details test
def test_update_self_student(client, student_login):
    response = client.patch(
        f"{settings.API_V1_STR}/users/me",
        json=StudentSampleData.request_body_student_update,
        headers={"Authorization": f"Bearer {student_login}"},
    )
    UserResponse(**response.json())
    assert response.status_code == 200
    assert (
        response.json()["email_id"]
        == StudentSampleData.request_body_student_update["email_id"]
    )


# wrong request body update test
def test_update_self_wrong_request_body(client, student_login):
    response = client.patch(
        f"{settings.API_V1_STR}/users/me",
        json=UserSampleData.request_body_wrong_model,
        headers={"Authorization": f"Bearer {student_login}"},
    )
    assert response.status_code == 422
    assert response.json()["detail"][0]["msg"] == "Value error, no value"


# delete own student user details test
def test_delete_self_student(session, client, student_login):
    response = client.delete(
        f"{settings.API_V1_STR}/users/me",
        headers={"Authorization": f"Bearer {student_login}"},
    )
    assert response.status_code == 204
    user = session.exec(
        select(User).where(
            User.email_id == StudentSampleData.request_body_student_login["username"]
        )
    ).first()
    assert user == None


# access without authorization
def test_access_without_login(client):
    response_get = client.get(
        f"{settings.API_V1_STR}/users/me",
    )
    response_patch = client.patch(
        f"{settings.API_V1_STR}/users/me",
        json=StudentSampleData.request_body_student_update,
    )
    response_delete = client.delete(
        f"{settings.API_V1_STR}/users/me",
    )
    assert response_get.status_code == 401
    assert response_patch.status_code == 401
    assert response_delete.status_code == 401
