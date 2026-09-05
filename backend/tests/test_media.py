import pytest
from ..core.config import settings
from ..models import MediaUploadPresigned, MediaAccessPresigned
from .sample_test_data import *
from sqlmodel import select


# upload a thumbnail to AWS S3 by course ID success test
def test_upload_course_media_thumbnail_success(client, teacher_profile, course_create):
    profile_response = teacher_profile(
        TeacherSampleData.request_body_user_teacher_creation_male,
        TeacherSampleData.request_body_user_teacher_login_male,
        TeacherSampleData.request_body_teacher_profile_creation_male,
    )
    response_course_create = course_create(
        profile_response, CourseSampleData.request_body_course_create_male
    )
    response_course_thumbnail = client.post(
        f"{settings.API_V1_STR}/courses/{response_course_create.json()["id"]}/media/thumbnail/upload",
        json=CourseSampleData.request_body_course_thumbnail_upload_male,
        headers={"Authorization": f"Bearer {profile_response["token"]}"},
    )
    MediaUploadPresigned(**response_course_thumbnail.json())
    assert response_course_thumbnail.status_code == 201


# wrong request body course thumbnail upload test
def test_upload_course_media_thumbnail_wrong_request_body(
    client, teacher_profile, course_create
):
    profile_response = teacher_profile(
        TeacherSampleData.request_body_user_teacher_creation_male,
        TeacherSampleData.request_body_user_teacher_login_male,
        TeacherSampleData.request_body_teacher_profile_creation_male,
    )
    response_course_create = course_create(
        profile_response, CourseSampleData.request_body_course_create_male
    )
    response_course_thumbnail = client.post(
        f"{settings.API_V1_STR}/courses/{response_course_create.json()["id"]}/media/thumbnail/upload",
        json=UserSampleData.request_body_wrong_model,
        headers={"Authorization": f"Bearer {profile_response["token"]}"},
    )
    assert response_course_thumbnail.status_code == 422
    assert response_course_thumbnail.json()["detail"][0]["msg"] == "Field required"


# upload a resource to AWS S3 by course ID success test
def test_upload_course_media_resource_success(client, teacher_profile, course_create):
    profile_response = teacher_profile(
        TeacherSampleData.request_body_user_teacher_creation_male,
        TeacherSampleData.request_body_user_teacher_login_male,
        TeacherSampleData.request_body_teacher_profile_creation_male,
    )
    response_course_create = course_create(
        profile_response, CourseSampleData.request_body_course_create_male
    )
    response_course_resource = client.post(
        f"{settings.API_V1_STR}/courses/{response_course_create.json()["id"]}/media/resource/upload",
        json=CourseSampleData.request_body_course_resource_upload_male,
        headers={"Authorization": f"Bearer {profile_response["token"]}"},
    )
    MediaUploadPresigned(**response_course_resource.json())
    assert response_course_resource.status_code == 201


# upload a resource to AWS S3 by course ID already exists fail test
def test_upload_course_media_resource_fail(client, teacher_profile, course_create):
    profile_response = teacher_profile(
        TeacherSampleData.request_body_user_teacher_creation_male,
        TeacherSampleData.request_body_user_teacher_login_male,
        TeacherSampleData.request_body_teacher_profile_creation_male,
    )
    response_course_create = course_create(
        profile_response, CourseSampleData.request_body_course_create_male
    )
    client.post(
        f"{settings.API_V1_STR}/courses/{response_course_create.json()["id"]}/media/resource/upload",
        json=CourseSampleData.request_body_course_resource_upload_male,
        headers={"Authorization": f"Bearer {profile_response["token"]}"},
    )
    response_course_resource_fail = client.post(
        f"{settings.API_V1_STR}/courses/{response_course_create.json()["id"]}/media/resource/upload",
        json=CourseSampleData.request_body_course_resource_upload_male,
        headers={"Authorization": f"Bearer {profile_response["token"]}"},
    )
    assert response_course_resource_fail.status_code == 409
    assert (
        response_course_resource_fail.json()["detail"] == "resource file already exists"
    )


# update media upload status to 'ready' test
def test_media_upload_status_success(client, teacher_profile, course_create):
    profile_response = teacher_profile(
        TeacherSampleData.request_body_user_teacher_creation_male,
        TeacherSampleData.request_body_user_teacher_login_male,
        TeacherSampleData.request_body_teacher_profile_creation_male,
    )
    response_course_create = course_create(
        profile_response, CourseSampleData.request_body_course_create_male
    )
    response_course_resource = client.post(
        f"{settings.API_V1_STR}/courses/{response_course_create.json()["id"]}/media/resource/upload",
        json=CourseSampleData.request_body_course_resource_upload_male,
        headers={"Authorization": f"Bearer {profile_response["token"]}"},
    )
    response_media_upload_status = client.post(
        f"{settings.API_V1_STR}/courses/{response_course_create.json()["id"]}/media/{response_course_resource.json()["media_id"]}/status",
        headers={"Authorization": f"Bearer {profile_response["token"]}"},
    )
    assert response_media_upload_status.status_code == 200
    assert response_media_upload_status.json()["detail"] == "ready"


# access course thumbnail from AWS S3 by course ID success test
def test_access_course_media_thumbnail_success(client, teacher_profile, course_create):
    profile_response = teacher_profile(
        TeacherSampleData.request_body_user_teacher_creation_male,
        TeacherSampleData.request_body_user_teacher_login_male,
        TeacherSampleData.request_body_teacher_profile_creation_male,
    )
    response_course_create = course_create(
        profile_response, CourseSampleData.request_body_course_create_male
    )
    response_course_thumbnail = client.post(
        f"{settings.API_V1_STR}/courses/{response_course_create.json()["id"]}/media/thumbnail/upload",
        json=CourseSampleData.request_body_course_thumbnail_upload_male,
        headers={"Authorization": f"Bearer {profile_response["token"]}"},
    )
    client.post(
        f"{settings.API_V1_STR}/courses/{response_course_create.json()["id"]}/media/{response_course_thumbnail.json()["media_id"]}/status",
        headers={"Authorization": f"Bearer {profile_response["token"]}"},
    )
    response_course_thumbnail_access = client.get(
        f"{settings.API_V1_STR}/courses/{response_course_create.json()["id"]}/media/thumbnail/access",
        headers={"Authorization": f"Bearer {profile_response["token"]}"},
    )
    MediaAccessPresigned(**response_course_thumbnail_access.json())
    assert response_course_thumbnail_access.status_code == 200
    assert (
        response_course_thumbnail_access.json()["course_id"]
        == response_course_create.json()["id"]
    )


# access course resource from AWS S3 by course ID success test
def test_access_course_media_resource_success(client, teacher_profile, course_create):
    profile_response = teacher_profile(
        TeacherSampleData.request_body_user_teacher_creation_male,
        TeacherSampleData.request_body_user_teacher_login_male,
        TeacherSampleData.request_body_teacher_profile_creation_male,
    )
    response_course_create = course_create(
        profile_response, CourseSampleData.request_body_course_create_male
    )
    response_course_resource = client.post(
        f"{settings.API_V1_STR}/courses/{response_course_create.json()["id"]}/media/resource/upload",
        json=CourseSampleData.request_body_course_resource_upload_male,
        headers={"Authorization": f"Bearer {profile_response["token"]}"},
    )
    client.post(
        f"{settings.API_V1_STR}/courses/{response_course_create.json()["id"]}/media/{response_course_resource.json()["media_id"]}/status",
        headers={"Authorization": f"Bearer {profile_response["token"]}"},
    )
    response_course_resource_access = client.get(
        f"{settings.API_V1_STR}/courses/{response_course_create.json()["id"]}/media/resource/access",
        headers={"Authorization": f"Bearer {profile_response["token"]}"},
    )
    MediaAccessPresigned(**response_course_resource_access.json())
    assert response_course_resource_access.status_code == 200
    assert (
        response_course_resource_access.json()["course_id"]
        == response_course_create.json()["id"]
    )


# access no course resource from AWS S3 by course ID fail test
def test_access_course_no_media_resource_fail(client, teacher_profile, course_create):
    profile_response = teacher_profile(
        TeacherSampleData.request_body_user_teacher_creation_male,
        TeacherSampleData.request_body_user_teacher_login_male,
        TeacherSampleData.request_body_teacher_profile_creation_male,
    )
    response_course_create = course_create(
        profile_response, CourseSampleData.request_body_course_create_male
    )
    client.post(
        f"{settings.API_V1_STR}/courses/{response_course_create.json()["id"]}/media/resource/upload",
        json=CourseSampleData.request_body_course_resource_upload_male,
        headers={"Authorization": f"Bearer {profile_response["token"]}"},
    )
    response_course_resource_access = client.get(
        f"{settings.API_V1_STR}/courses/{response_course_create.json()["id"]}/media/resource/access",
        headers={"Authorization": f"Bearer {profile_response["token"]}"},
    )
    assert response_course_resource_access.status_code == 404
    assert response_course_resource_access.json()["detail"] == "media not found"


# access without authorization
def test_access_without_login(client):
    response_course_thumbnail_upload = client.post(
        f"{settings.API_V1_STR}/courses/{"e7b8f9a2-4c5d-4e6f-8a1b-2c3d4e5f6a7b"}/media/thumbnail/upload",
    )
    response_course_resource_upload = client.post(
        f"{settings.API_V1_STR}/courses/{"e7b8f9a2-4c5d-4e6f-8a1b-2c3d4e5f6a7b"}/media/resource/upload",
    )
    response_media_upload_status = client.post(
        f"{settings.API_V1_STR}/courses/{"e7b8f9a2-4c5d-4e6f-8a1b-2c3d4e5f6a7b"}/media/{"z7b8f9a2-4c5d-4e6f-8a1b-2c3d4f5f6a7b"}/status",
    )
    response_course_thumbnail_access = client.get(
        f"{settings.API_V1_STR}/courses/{"e7b8f9a2-4c5d-4e6f-8a1b-2c3d4e5f6a7b"}/media/thumbnail/access",
    )
    response_course_resource_access = client.get(
        f"{settings.API_V1_STR}/courses/{"e7b8f9a2-4c5d-4e6f-8a1b-2c3d4e5f6a7b"}/media/resource/access",
    )
    assert response_course_thumbnail_upload.status_code == 401
    assert response_course_resource_upload.status_code == 401
    assert response_media_upload_status.status_code == 401
    assert response_course_thumbnail_access.status_code == 404
    assert response_course_resource_access.status_code == 401
