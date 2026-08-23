import pytest
from ..core.config import settings
from ..models import Teacher, TeacherResponse
from .sample_test_data import *
from sqlmodel import select


# access without authorization
def test_access_without_login(client):
    response_create_account = client.post(
        f"{settings.API_V1_STR}/teachers",
    )
    response_get_self = client.get(
        f"{settings.API_V1_STR}/teachers/me",
    )
    response_update_self = client.patch(
        f"{settings.API_V1_STR}/teachers/me",
    )
    assert response_create_account.status_code == 401
    assert response_get_self.status_code == 401
    assert response_update_self.status_code == 401


# wrong request body create teacher test
def test_create_teacher_wrong_request_body(client, user_login):
    login_response = user_login(
        TeacherSampleData.request_body_user_teacher_creation_male,
        TeacherSampleData.request_body_user_teacher_login_male,
    )
    response = client.post(
        f"{settings.API_V1_STR}/teachers",
        json=UserSampleData.request_body_wrong_model,
        headers={"Authorization": f"Bearer {login_response["token"]}"},
    )
    assert response.status_code == 422
    assert response.json()["detail"][0]["msg"] == "Field required"


# create teacher success test
@pytest.mark.parametrize(
    "request_body_user_create, request_body_user_login, request_body_teacher_create",
    [
        [
            TeacherSampleData.request_body_user_teacher_creation_male,
            TeacherSampleData.request_body_user_teacher_login_male,
            TeacherSampleData.request_body_teacher_profile_creation_male,
        ],
        [
            TeacherSampleData.request_body_user_teacher_creation_male,
            TeacherSampleData.request_body_user_teacher_login_male,
            TeacherSampleData.request_body_teacher_profile_creation_female,
        ],
    ],
)
def test_create_teacher_success(
    client,
    user_login,
    request_body_user_create,
    request_body_user_login,
    request_body_teacher_create,
):
    login_response = user_login(
        request_body_user_create,
        request_body_user_login,
    )
    response = client.post(
        f"{settings.API_V1_STR}/teachers",
        json=request_body_teacher_create,
        headers={"Authorization": f"Bearer {login_response["token"]}"},
    )
    print(response.json())
    TeacherResponse(**response.json())
    assert response.status_code == 201
    assert response.json()["first_name"] == request_body_teacher_create["first_name"]
    assert (
        response.json()["user"]["id"] == login_response["account_response"].json()["id"]
    )


# get self teacher success test
def test_get_self_success(client, teacher_profile):
    profile_response = teacher_profile(
        TeacherSampleData.request_body_user_teacher_creation_male,
        TeacherSampleData.request_body_user_teacher_login_male,
        TeacherSampleData.request_body_teacher_profile_creation_male,
    )
    response = client.get(
        f"{settings.API_V1_STR}/teachers/me",
        headers={"Authorization": f"Bearer {profile_response["token"]}"},
    )
    TeacherResponse(**response.json())
    assert response.status_code == 200
    assert (
        response.json()["first_name"]
        == profile_response["profile_response"].json()["first_name"]
    )
    assert (
        response.json()["user"]["id"]
        == profile_response["profile_response"].json()["user"]["id"]
    )


# wrong request body update teacher test
def test_update_teacher_wrong_request_body(client, teacher_profile):
    profile_response = teacher_profile(
        TeacherSampleData.request_body_user_teacher_creation_male,
        TeacherSampleData.request_body_user_teacher_login_male,
        TeacherSampleData.request_body_teacher_profile_creation_male,
    )
    response = client.patch(
        f"{settings.API_V1_STR}/teachers/me",
        json=UserSampleData.request_body_wrong_model,
        headers={"Authorization": f"Bearer {profile_response["token"]}"},
    )
    assert response.status_code == 422
    assert response.json()["detail"][0]["msg"] == "Value error, no value"


# update own teacher user details test
def test_update_self_teacher_success(client, teacher_profile):
    profile_response = teacher_profile(
        TeacherSampleData.request_body_user_teacher_creation_male,
        TeacherSampleData.request_body_user_teacher_login_male,
        TeacherSampleData.request_body_teacher_profile_creation_male,
    )
    response = client.patch(
        f"{settings.API_V1_STR}/teachers/me",
        json=TeacherSampleData.request_body_teacher_profile_update_male,
        headers={"Authorization": f"Bearer {profile_response["token"]}"},
    )
    TeacherResponse(**response.json())
    assert response.status_code == 200
    assert (
        response.json()["phone_no"]
        == TeacherSampleData.request_body_teacher_profile_update_male["phone_no"]
    )


# update fail no teacher profile test
def test_update_self_teacher_no_profile_fail(client, user_login):
    login_response = user_login(
        TeacherSampleData.request_body_user_teacher_creation_male,
        TeacherSampleData.request_body_user_teacher_login_male,
    )
    response = client.patch(
        f"{settings.API_V1_STR}/teachers/me",
        json=TeacherSampleData.request_body_teacher_profile_update_male,
        headers={"Authorization": f"Bearer {login_response["token"]}"},
    )
    assert response.status_code == 404
    assert response.json()["detail"] == "teacher id not found"


# update fail same phone no test
def test_update_self_teacher_same_phno_fail(client, teacher_profile):
    profile_response = teacher_profile(
        TeacherSampleData.request_body_user_teacher_creation_male,
        TeacherSampleData.request_body_user_teacher_login_male,
        TeacherSampleData.request_body_teacher_profile_creation_male,
    )
    teacher_profile(
        TeacherSampleData.request_body_user_teacher_creation_female,
        TeacherSampleData.request_body_user_teacher_login_female,
        TeacherSampleData.request_body_teacher_profile_creation_female,
    )
    response = client.patch(
        f"{settings.API_V1_STR}/teachers/me",
        json=TeacherSampleData.request_body_teacher_profile_update_same_phno_male,
        headers={"Authorization": f"Bearer {profile_response["token"]}"},
    )
    assert response.status_code == 409
    assert response.json()["detail"] == "phone number already exists"
