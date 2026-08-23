import pytest
from ..core.config import settings
from ..models import UserResponse, User
from .sample_test_data import *
from sqlmodel import select


# create user account test
@pytest.mark.parametrize(
    "request_body, response_body",
    [
        (
            TeacherSampleData.request_body_user_teacher_creation,
            TeacherSampleData.response_body_user_teacher_creation,
        ),
        (
            StudentSampleData.request_body_user_student_creation_male,
            StudentSampleData.response_body_user_student_creation_male,
        ),
    ],
)
def test_cereate_user_success(client, user_account, request_body, response_body):
    response = user_account(request_body)
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
        f"{settings.API_V1_STR}/users",
        json=AdminSampleData.request_body_user_admin_creation,
    )
    assert response.status_code == 422
    assert response.json()["detail"][0]["msg"] == "Value error, access denied"


# user email already exists test
def test_user_email_exists(client):
    client.post(
        f"{settings.API_V1_STR}/users",
        json=StudentSampleData.request_body_user_student_creation_male,
    )
    response = client.post(
        f"{settings.API_V1_STR}/users",
        json=StudentSampleData.request_body_user_student_creation_male,
    )
    assert response.status_code == 409
    assert response.json()["detail"] == "email id already exists"


# get self student data test
def test_get_self_student(client, user_login):
    login_response = user_login(
        StudentSampleData.request_body_user_student_creation_male,
        StudentSampleData.request_body_user_student_login_male,
    )
    response = client.get(
        f"{settings.API_V1_STR}/users/me",
        headers={"Authorization": f"Bearer {login_response["token"]}"},
    )
    UserResponse(**response.json())
    assert response.status_code == 200
    assert (
        response.json()["email_id"]
        == StudentSampleData.request_body_user_student_login_male["username"]
    )
    assert (
        response.json()["role"]
        == StudentSampleData.request_body_user_student_creation_male["role"]
    )


# update own student user details test
def test_update_self_student(client, user_login):
    login_response = user_login(
        StudentSampleData.request_body_user_student_creation_male,
        StudentSampleData.request_body_user_student_login_male,
    )
    response = client.patch(
        f"{settings.API_V1_STR}/users/me",
        json=StudentSampleData.request_body_user_student_update_male,
        headers={"Authorization": f"Bearer {login_response["token"]}"},
    )
    UserResponse(**response.json())
    assert response.status_code == 200
    assert (
        response.json()["email_id"]
        == StudentSampleData.request_body_user_student_update_male["email_id"]
    )


# wrong request body update test
def test_update_self_wrong_request_body(client, user_login):
    login_response = user_login(
        StudentSampleData.request_body_user_student_creation_male,
        StudentSampleData.request_body_user_student_login_male,
    )
    response = client.patch(
        f"{settings.API_V1_STR}/users/me",
        json=UserSampleData.request_body_wrong_model,
        headers={"Authorization": f"Bearer {login_response["token"]}"},
    )
    assert response.status_code == 422
    assert response.json()["detail"][0]["msg"] == "Value error, no value"


# delete own student user details test
def test_delete_self_student(session, client, user_login):
    login_response = user_login(
        StudentSampleData.request_body_user_student_creation_male,
        StudentSampleData.request_body_user_student_login_male,
    )
    response = client.delete(
        f"{settings.API_V1_STR}/users/me",
        headers={"Authorization": f"Bearer {login_response["token"]}"},
    )
    assert response.status_code == 204
    user = session.exec(
        select(User).where(
            User.email_id
            == StudentSampleData.request_body_user_student_login_male["username"]
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
        json=StudentSampleData.request_body_user_student_update_male,
    )
    response_delete = client.delete(
        f"{settings.API_V1_STR}/users/me",
    )
    assert response_get.status_code == 401
    assert response_patch.status_code == 401
    assert response_delete.status_code == 401
