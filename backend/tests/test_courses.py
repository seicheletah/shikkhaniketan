import pytest
from ..core.config import settings
from ..models import Course, CourseResponse, CoursePublicResponse
from .sample_test_data import *
from sqlmodel import select


# access without authorization
def test_access_without_login(client):
    response_create_course = client.post(
        f"{settings.API_V1_STR}/courses",
    )
    assert response_create_course.status_code == 401


# wrong request body create course test
def test_create_course_wrong_request_body(teacher_profile, course_create):
    profile_response = teacher_profile(
        TeacherSampleData.request_body_user_teacher_creation_male,
        TeacherSampleData.request_body_user_teacher_login_male,
        TeacherSampleData.request_body_teacher_profile_creation_male,
    )
    response_course = course_create(
        profile_response, UserSampleData.request_body_wrong_model
    )
    assert response_course.status_code == 422
    assert response_course.json()["detail"][0]["msg"] == "Field required"


# create course success test
def test_create_course_success(teacher_profile, course_create):
    profile_response = teacher_profile(
        TeacherSampleData.request_body_user_teacher_creation_male,
        TeacherSampleData.request_body_user_teacher_login_male,
        TeacherSampleData.request_body_teacher_profile_creation_male,
    )
    response = course_create(
        profile_response, CourseSampleData.request_body_course_create_male
    )
    CourseResponse(**response.json())
    assert response.status_code == 201
    assert (
        response.json()["course_name"]
        == CourseSampleData.request_body_course_create_male["course_name"]
    )
    assert (
        response.json()["teacher"]["user"]["id"]
        == profile_response["account_response"].json()["id"]
    )


# create course fail no teacher id test
def test_create_course_no_teacher_fail(user_login, course_create):
    login_response = user_login(
        TeacherSampleData.request_body_user_teacher_creation_male,
        TeacherSampleData.request_body_user_teacher_login_male,
    )
    response_course_create = course_create(
        login_response, CourseSampleData.request_body_course_create_male
    )
    assert response_course_create.status_code == 404
    assert response_course_create.json()["detail"] == "teacher id not found"


# search courses using query parameters success test
def test_search_course_success(client, teacher_profile, course_create):
    profile_response = teacher_profile(
        TeacherSampleData.request_body_user_teacher_creation_male,
        TeacherSampleData.request_body_user_teacher_login_male,
        TeacherSampleData.request_body_teacher_profile_creation_male,
    )
    response_course_create = course_create(
        profile_response, CourseSampleData.request_body_course_create_male
    )
    response_get_course = client.get(
        f"{settings.API_V1_STR}/courses/search?q={CourseSampleData.request_body_course_create_male["course_name"]}",
    )
    CoursePublicResponse(**response_get_course.json()[0])
    assert response_get_course.status_code == 200
    assert (
        response_get_course.json()[0]["course_name"]
        == CourseSampleData.request_body_course_create_male["course_name"]
    )
    assert response_get_course.json()[0]["id"] == response_course_create.json()["id"]


# get single course by id success test
def test_get_course_id_success(client, teacher_profile, course_create):
    profile_response = teacher_profile(
        TeacherSampleData.request_body_user_teacher_creation_male,
        TeacherSampleData.request_body_user_teacher_login_male,
        TeacherSampleData.request_body_teacher_profile_creation_male,
    )
    response_course_create = course_create(
        profile_response, CourseSampleData.request_body_course_create_male
    )
    response_get_course = client.get(
        f"{settings.API_V1_STR}/courses/{response_course_create.json()["id"]}",
    )
    CoursePublicResponse(**response_get_course.json())
    assert response_get_course.status_code == 200
    assert response_get_course.json()["id"] == response_course_create.json()["id"]


# get single course by id fail test
def test_get_course_no_id_fail(client):
    response_get_course = client.get(
        f"{settings.API_V1_STR}/courses/{"2f4f3e55-7615-4502-8b5c-398ce98bd113"}",
    )
    assert response_get_course.status_code == 404
    assert response_get_course.json()["detail"] == "course not found"
