import pytest
from ..core.config import settings
from ..models import (
    TeacherResponse,
    Course,
    CourseResponse,
    CoursePublicResponse,
)
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
    response_teacher_course = client.get(
        f"{settings.API_V1_STR}/teachers/{"bc8f0412-a89e-436f-b271-e493df1ba8c2"}/courses",
    )
    response_course_update = client.patch(
        f"{settings.API_V1_STR}/teachers/me/courses/{"bc8f0412-a89e-436f-b271-e493df1ba8c2"}",
        json=CourseSampleData.request_body_course_update_male,
    )
    response_course_delete = client.delete(
        f"{settings.API_V1_STR}/teachers/me/courses/{"bc8f0412-a89e-436f-b271-e493df1ba8c2"}",
    )
    assert response_create_account.status_code == 401
    assert response_get_self.status_code == 401
    assert response_update_self.status_code == 401
    assert response_teacher_course.status_code == 401
    assert response_course_update.status_code == 401
    assert response_course_delete.status_code == 401


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
    response_course_update = client.patch(
        f"{settings.API_V1_STR}/teachers/me",
        json=UserSampleData.request_body_wrong_model,
        headers={"Authorization": f"Bearer {profile_response["token"]}"},
    )
    assert response_course_update.status_code == 422
    assert response_course_update.json()["detail"][0]["msg"] == "Value error, no value"


# update own teacher user details test
def test_update_self_teacher_success(client, teacher_profile):
    profile_response = teacher_profile(
        TeacherSampleData.request_body_user_teacher_creation_male,
        TeacherSampleData.request_body_user_teacher_login_male,
        TeacherSampleData.request_body_teacher_profile_creation_male,
    )
    response_course_update = client.patch(
        f"{settings.API_V1_STR}/teachers/me",
        json=TeacherSampleData.request_body_teacher_profile_update_male,
        headers={"Authorization": f"Bearer {profile_response["token"]}"},
    )
    TeacherResponse(**response_course_update.json())
    assert response_course_update.status_code == 200
    assert (
        response_course_update.json()["phone_no"]
        == TeacherSampleData.request_body_teacher_profile_update_male["phone_no"]
    )


# update fail no teacher profile test
def test_update_self_teacher_no_profile_fail(client, user_login):
    login_response = user_login(
        TeacherSampleData.request_body_user_teacher_creation_male,
        TeacherSampleData.request_body_user_teacher_login_male,
    )
    response_course_update = client.patch(
        f"{settings.API_V1_STR}/teachers/me",
        json=TeacherSampleData.request_body_teacher_profile_update_male,
        headers={"Authorization": f"Bearer {login_response["token"]}"},
    )
    assert response_course_update.status_code == 404
    assert response_course_update.json()["detail"] == "teacher id not found"


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
    response_course_update = client.patch(
        f"{settings.API_V1_STR}/teachers/me",
        json=TeacherSampleData.request_body_teacher_profile_update_same_phno_male,
        headers={"Authorization": f"Bearer {profile_response["token"]}"},
    )
    assert response_course_update.status_code == 409
    assert response_course_update.json()["detail"] == "phone number already exists"


# get self teacher courses success test
def test_get_self_courses_success(client, teacher_profile, course_create):
    profile_response = teacher_profile(
        TeacherSampleData.request_body_user_teacher_creation_male,
        TeacherSampleData.request_body_user_teacher_login_male,
        TeacherSampleData.request_body_teacher_profile_creation_male,
    )
    response_course = course_create(
        profile_response, CourseSampleData.request_body_course_create_male
    )
    response_teacher_course = client.get(
        f"{settings.API_V1_STR}/teachers/me/courses",
        headers={"Authorization": f"Bearer {profile_response["token"]}"},
    )
    CourseResponse(**response_teacher_course.json()[0])
    assert response_teacher_course.status_code == 200
    assert (
        response_teacher_course.json()[0]["course_language"]
        == response_course.json()["course_language"]
    )
    assert (
        response_teacher_course.json()[0]["teacher"]["user"]["id"]
        == profile_response["profile_response"].json()["user"]["id"]
    )


# get teacher courses by id success test
def test_get_teacher_courses_id_success(
    client, student_profile, teacher_profile, course_create
):
    student_profile_response = student_profile(
        StudentSampleData.request_body_user_student_creation_male,
        StudentSampleData.request_body_user_student_login_male,
        StudentSampleData.request_body_student_profile_creation_male,
    )
    teacher_profile_response = teacher_profile(
        TeacherSampleData.request_body_user_teacher_creation_male,
        TeacherSampleData.request_body_user_teacher_login_male,
        TeacherSampleData.request_body_teacher_profile_creation_male,
    )
    response_course = course_create(
        teacher_profile_response, CourseSampleData.request_body_course_create_male
    )
    response_teacher_course = client.get(
        f"{settings.API_V1_STR}/teachers/{teacher_profile_response["profile_response"].json()["user"]["id"]}/courses",
        headers={"Authorization": f"Bearer {student_profile_response["token"]}"},
    )
    CoursePublicResponse(**response_teacher_course.json()[0])
    assert response_teacher_course.status_code == 200
    assert (
        response_teacher_course.json()[0]["course_language"]
        == response_course.json()["course_language"]
    )
    assert (
        response_teacher_course.json()[0]["teacher"]["user"]["id"]
        == teacher_profile_response["profile_response"].json()["user"]["id"]
    )


# wrong request body update teacher course test
def test_update_self_course_wrong_request_body(client, teacher_profile, course_create):
    profile_response = teacher_profile(
        TeacherSampleData.request_body_user_teacher_creation_male,
        TeacherSampleData.request_body_user_teacher_login_male,
        TeacherSampleData.request_body_teacher_profile_creation_male,
    )
    response_course = course_create(
        profile_response, CourseSampleData.request_body_course_create_male
    )
    response_course_update = client.patch(
        f"{settings.API_V1_STR}/teachers/me/courses/{response_course.json()["id"]}",
        json=UserSampleData.request_body_wrong_model,
        headers={"Authorization": f"Bearer {profile_response["token"]}"},
    )
    assert response_course_update.status_code == 422
    assert response_course_update.json()["detail"][0]["msg"] == "Value error, no value"


# update teacher self course details test
def test_update_self_course_success(client, teacher_profile, course_create):
    profile_response = teacher_profile(
        TeacherSampleData.request_body_user_teacher_creation_male,
        TeacherSampleData.request_body_user_teacher_login_male,
        TeacherSampleData.request_body_teacher_profile_creation_male,
    )
    response_course = course_create(
        profile_response, CourseSampleData.request_body_course_create_male
    )
    response_course_update = client.patch(
        f"{settings.API_V1_STR}/teachers/me/courses/{response_course.json()["id"]}",
        json=CourseSampleData.request_body_course_update_male,
        headers={"Authorization": f"Bearer {profile_response["token"]}"},
    )
    CourseResponse(**response_course_update.json())
    assert response_course_update.status_code == 200
    assert (
        response_course_update.json()["course_language"]
        == CourseSampleData.request_body_course_update_male["course_language"]
    )
    assert (
        response_course_update.json()["teacher"]["user"]["id"]
        == profile_response["account_response"].json()["id"]
    )


# update fail no course id test
def test_update_self_course_no_id_fail(client, teacher_profile):
    profile_response = teacher_profile(
        TeacherSampleData.request_body_user_teacher_creation_male,
        TeacherSampleData.request_body_user_teacher_login_male,
        TeacherSampleData.request_body_teacher_profile_creation_male,
    )
    response_course_update = client.patch(
        f"{settings.API_V1_STR}/teachers/me/courses/2f4f3e55-7615-4502-8b5c-398ce98bd113",
        json=CourseSampleData.request_body_course_update_male,
        headers={"Authorization": f"Bearer {profile_response["token"]}"},
    )
    assert response_course_update.status_code == 404
    assert response_course_update.json()["detail"] == "course not found"


# delete self teacher course test
def test_delete_self_course_success(session, client, teacher_profile, course_create):
    profile_response = teacher_profile(
        TeacherSampleData.request_body_user_teacher_creation_male,
        TeacherSampleData.request_body_user_teacher_login_male,
        TeacherSampleData.request_body_teacher_profile_creation_male,
    )
    response_course = course_create(
        profile_response, CourseSampleData.request_body_course_create_male
    )
    response_course_delete = client.delete(
        f"{settings.API_V1_STR}/teachers/me/courses/{response_course.json()["id"]}",
        headers={"Authorization": f"Bearer {profile_response["token"]}"},
    )
    assert response_course_delete.status_code == 204
    course = session.exec(
        select(Course).where(Course.id == response_course.json()["id"])
    ).first()
    assert course == None


# delete fail no course id test
def test_delete_self_course_no_id_fail(client, teacher_profile):
    profile_response = teacher_profile(
        TeacherSampleData.request_body_user_teacher_creation_male,
        TeacherSampleData.request_body_user_teacher_login_male,
        TeacherSampleData.request_body_teacher_profile_creation_male,
    )
    response_course_delete = client.delete(
        f"{settings.API_V1_STR}/teachers/me/courses/2f4f3e55-7615-4502-8b5c-398ce98bd113",
        headers={"Authorization": f"Bearer {profile_response["token"]}"},
    )
    assert response_course_delete.status_code == 404
    assert response_course_delete.json()["detail"] == "course not found"
