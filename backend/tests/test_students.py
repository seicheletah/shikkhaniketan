import pytest
from ..core.config import settings
from ..models import Student, StudentResponse, ReviewResponse, Review
from .sample_test_data import *
from sqlmodel import select
from .test_purchase import generate_valid_signature


# access without authorization
def test_access_without_login(client):
    response_create_account = client.post(
        f"{settings.API_V1_STR}/students",
    )
    response_get_self = client.get(
        f"{settings.API_V1_STR}/students/me",
    )
    response_update_self = client.patch(
        f"{settings.API_V1_STR}/students/me",
    )
    response_review_update = client.patch(
        f"{settings.API_V1_STR}/students/me/courses/{"bc8f0412-a89e-436f-b271-e493df1ba8c2"}/review",
        json=ReviewSampleData.request_body_review_update,
    )
    response_review_delete = client.delete(
        f"{settings.API_V1_STR}/students/me/courses/{"bc8f0412-a89e-436f-b271-e493df1ba8c2"}/review",
    )
    assert response_create_account.status_code == 401
    assert response_get_self.status_code == 401
    assert response_update_self.status_code == 401
    assert response_review_update.status_code == 401
    assert response_review_delete.status_code == 401


# wrong request body create student test
def test_create_student_wrong_request_body(client, user_login):
    login_response = user_login(
        StudentSampleData.request_body_user_student_creation_male,
        StudentSampleData.request_body_user_student_login_male,
    )
    response = client.post(
        f"{settings.API_V1_STR}/students",
        json=UserSampleData.request_body_wrong_model,
        headers={"Authorization": f"Bearer {login_response["token"]}"},
    )
    assert response.status_code == 422
    assert response.json()["detail"][0]["msg"] == "Field required"


# create student success test
@pytest.mark.parametrize(
    "request_body_user_create, request_body_user_login, request_body_student_create",
    [
        [
            StudentSampleData.request_body_user_student_creation_male,
            StudentSampleData.request_body_user_student_login_male,
            StudentSampleData.request_body_student_profile_creation_male,
        ],
        [
            StudentSampleData.request_body_user_student_creation_male,
            StudentSampleData.request_body_user_student_login_male,
            StudentSampleData.request_body_student_profile_creation_female,
        ],
    ],
)
def test_create_student_success(
    client,
    user_login,
    request_body_user_create,
    request_body_user_login,
    request_body_student_create,
):
    login_response = user_login(
        request_body_user_create,
        request_body_user_login,
    )
    response = client.post(
        f"{settings.API_V1_STR}/students",
        json=request_body_student_create,
        headers={"Authorization": f"Bearer {login_response["token"]}"},
    )
    print(response.json())
    StudentResponse(**response.json())
    assert response.status_code == 201
    assert response.json()["first_name"] == request_body_student_create["first_name"]
    assert (
        response.json()["user"]["id"] == login_response["account_response"].json()["id"]
    )


# get self student success test
def test_get_self_success(client, student_profile):
    profile_response = student_profile(
        StudentSampleData.request_body_user_student_creation_male,
        StudentSampleData.request_body_user_student_login_male,
        StudentSampleData.request_body_student_profile_creation_male,
    )
    response = client.get(
        f"{settings.API_V1_STR}/students/me",
        headers={"Authorization": f"Bearer {profile_response["token"]}"},
    )
    StudentResponse(**response.json())
    assert response.status_code == 200
    assert (
        response.json()["first_name"]
        == profile_response["profile_response"].json()["first_name"]
    )
    assert (
        response.json()["user"]["id"]
        == profile_response["profile_response"].json()["user"]["id"]
    )


# wrong request body update student test
def test_update_student_wrong_request_body(client, student_profile):
    profile_response = student_profile(
        StudentSampleData.request_body_user_student_creation_male,
        StudentSampleData.request_body_user_student_login_male,
        StudentSampleData.request_body_student_profile_creation_male,
    )
    response = client.patch(
        f"{settings.API_V1_STR}/students/me",
        json=UserSampleData.request_body_wrong_model,
        headers={"Authorization": f"Bearer {profile_response["token"]}"},
    )
    assert response.status_code == 422
    assert response.json()["detail"][0]["msg"] == "Value error, no value"


# update own student user details success test
def test_update_self_student_success(client, student_profile):
    profile_response = student_profile(
        StudentSampleData.request_body_user_student_creation_male,
        StudentSampleData.request_body_user_student_login_male,
        StudentSampleData.request_body_student_profile_creation_male,
    )
    response = client.patch(
        f"{settings.API_V1_STR}/students/me",
        json=StudentSampleData.request_body_student_profile_update_male,
        headers={"Authorization": f"Bearer {profile_response["token"]}"},
    )
    StudentResponse(**response.json())
    assert response.status_code == 200
    assert (
        response.json()["phone_no"]
        == StudentSampleData.request_body_student_profile_update_male["phone_no"]
    )


# update fail no student profile test
def test_update_self_student_no_profile_fail(client, user_login):
    login_response = user_login(
        StudentSampleData.request_body_user_student_creation_male,
        StudentSampleData.request_body_user_student_login_male,
    )
    response = client.patch(
        f"{settings.API_V1_STR}/students/me",
        json=StudentSampleData.request_body_student_profile_update_male,
        headers={"Authorization": f"Bearer {login_response["token"]}"},
    )
    assert response.status_code == 404
    assert response.json()["detail"] == "student id not found"


# update fail same phone no test
def test_update_self_student_same_phno_fail(client, student_profile):
    profile_response = student_profile(
        StudentSampleData.request_body_user_student_creation_male,
        StudentSampleData.request_body_user_student_login_male,
        StudentSampleData.request_body_student_profile_creation_male,
    )
    student_profile(
        StudentSampleData.request_body_user_student_creation_female,
        StudentSampleData.request_body_user_student_login_female,
        StudentSampleData.request_body_student_profile_creation_female,
    )
    response = client.patch(
        f"{settings.API_V1_STR}/students/me",
        json=StudentSampleData.request_body_student_profile_update_same_phno_male,
        headers={"Authorization": f"Bearer {profile_response["token"]}"},
    )
    assert response.status_code == 409
    assert response.json()["detail"] == "phone number already exists"


# update own review done to a course success test
def test_update_self_review_success(
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
    response_course_create = course_create(
        teacher_profile_response, CourseSampleData.request_body_course_create_male
    )
    response_purchase_order = client.post(
        f"{settings.API_V1_STR}/courses/{response_course_create.json()["id"]}/purchase",
        headers={"Authorization": f"Bearer {student_profile_response["token"]}"},
    )
    valid_signature = generate_valid_signature(
        response_purchase_order.json()["id"],
        "pay_DG4ZdRK8ZnXC3k",
        settings.RAZORPAY_KEY_SECRET,
    )
    request_body = {
        "razorpay_order_id": response_purchase_order.json()["id"],
        "razorpay_payment_id": "pay_DG4ZdRK8ZnXC3k",
        "razorpay_signature": valid_signature,
        "course_id": response_course_create.json()["id"],
    }
    client.post(
        f"{settings.API_V1_STR}/courses/verify-payment",
        json=request_body,
        headers={"Authorization": f"Bearer {student_profile_response["token"]}"},
    )
    response_review_create = client.post(
        f"{settings.API_V1_STR}/courses/{response_course_create.json()["id"]}/review",
        json=ReviewSampleData.request_body_review_create,
        headers={"Authorization": f"Bearer {student_profile_response["token"]}"},
    )
    response_review_update = client.patch(
        f"{settings.API_V1_STR}/students/me/courses/{response_course_create.json()["id"]}/review",
        json=ReviewSampleData.request_body_review_update,
        headers={"Authorization": f"Bearer {student_profile_response["token"]}"},
    )
    ReviewResponse(**response_review_update.json())
    assert response_review_update.status_code == 200
    assert (
        response_review_update.json()["comment"]
        == ReviewSampleData.request_body_review_update["comment"]
    )
    assert (
        response_review_update.json()["rate"]
        == ReviewSampleData.request_body_review_update["rate"]
    )
    assert (
        response_review_update.json()["course_id"]
        == response_review_create.json()["course_id"]
    )


# delete own review done to a course success test
def test_delete_self_review_success(
    session, client, student_profile, teacher_profile, course_create
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
    response_course_create = course_create(
        teacher_profile_response, CourseSampleData.request_body_course_create_male
    )
    response_purchase_order = client.post(
        f"{settings.API_V1_STR}/courses/{response_course_create.json()["id"]}/purchase",
        headers={"Authorization": f"Bearer {student_profile_response["token"]}"},
    )
    valid_signature = generate_valid_signature(
        response_purchase_order.json()["id"],
        "pay_DG4ZdRK8ZnXC3k",
        settings.RAZORPAY_KEY_SECRET,
    )
    request_body = {
        "razorpay_order_id": response_purchase_order.json()["id"],
        "razorpay_payment_id": "pay_DG4ZdRK8ZnXC3k",
        "razorpay_signature": valid_signature,
        "course_id": response_course_create.json()["id"],
    }
    client.post(
        f"{settings.API_V1_STR}/courses/verify-payment",
        json=request_body,
        headers={"Authorization": f"Bearer {student_profile_response["token"]}"},
    )
    client.post(
        f"{settings.API_V1_STR}/courses/{response_course_create.json()["id"]}/review",
        json=ReviewSampleData.request_body_review_create,
        headers={"Authorization": f"Bearer {student_profile_response["token"]}"},
    )
    response_review_delete = client.delete(
        f"{settings.API_V1_STR}/students/me/courses/{response_course_create.json()["id"]}/review",
        headers={"Authorization": f"Bearer {student_profile_response["token"]}"},
    )
    assert response_review_delete.status_code == 204
    review = session.exec(
        select(Review).where(
            Review.student_id
            == student_profile_response["account_response"].json()["id"]
        )
    ).first()
    assert review == None
