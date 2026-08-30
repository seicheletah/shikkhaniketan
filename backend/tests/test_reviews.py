import pytest
from ..core.config import settings
from ..models import ReviewResponse, ReviewPublicResponse, RatingPublicResponse
from .sample_test_data import *
from sqlmodel import select
from .test_purchase import generate_valid_signature


# create a review on a course with no enrollment fail test
def test_create_review_not_enrolled_fail(
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
    response_review_create = client.post(
        f"{settings.API_V1_STR}/courses/{response_course_create.json()["id"]}/review",
        json=ReviewSampleData.request_body_review_create,
        headers={"Authorization": f"Bearer {student_profile_response["token"]}"},
    )
    assert response_review_create.status_code == 403
    assert response_review_create.json()["detail"] == "access denied"


# create a review on a course success test
def test_create_review_success(client, student_profile, teacher_profile, course_create):
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
    response_review_create_already_exists_fail = client.post(
        f"{settings.API_V1_STR}/courses/{response_course_create.json()["id"]}/review",
        json=ReviewSampleData.request_body_review_create,
        headers={"Authorization": f"Bearer {student_profile_response["token"]}"},
    )
    ReviewResponse(**response_review_create.json())
    assert response_review_create.status_code == 201
    assert response_review_create_already_exists_fail.status_code == 409
    assert (
        response_review_create.json()["comment"]
        == ReviewSampleData.request_body_review_create["comment"]
    )
    assert (
        response_review_create.json()["rate"]
        == ReviewSampleData.request_body_review_create["rate"]
    )
    assert (
        response_review_create.json()["course_id"]
        == response_course_create.json()["id"]
    )


# get all reviews on a course success test
def test_get_review_success(client, student_profile, teacher_profile, course_create):
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
    response_get_review = client.get(
        f"{settings.API_V1_STR}/courses/{response_course_create.json()["id"]}/review",
    )
    ReviewPublicResponse(**response_get_review.json()[0])
    assert response_get_review.status_code == 200
    assert (
        response_get_review.json()[0]["comment"]
        == ReviewSampleData.request_body_review_create["comment"]
    )
    assert (
        response_get_review.json()[0]["rate"]
        == ReviewSampleData.request_body_review_create["rate"]
    )
    assert (
        response_get_review.json()[0]["first_name"]
        == student_profile_response["profile_response"].json()["first_name"]
    )
    assert (
        response_get_review.json()[0]["course_id"]
        == response_course_create.json()["id"]
    )


# get total ratings on a course success test
def test_get_rating_success(client, student_profile, teacher_profile, course_create):
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
    response_get_rating = client.get(
        f"{settings.API_V1_STR}/courses/{response_course_create.json()["id"]}/rating",
    )
    RatingPublicResponse(**response_get_rating.json())
    assert response_get_rating.status_code == 200
    assert (
        response_get_rating.json()["course_id"] == response_course_create.json()["id"]
    )


# access without authorization
def test_access_without_login(client):
    response_review_create = client.post(
        f"{settings.API_V1_STR}/courses/{"2f4f3e55-7615-4502-8b5c-398ce98bd113"}/review",
    )
    response_get_review = client.get(
        f"{settings.API_V1_STR}/courses/{"2f4f3e55-7615-4502-8b5c-398ce98bd113"}/review",
    )
    response_get_rating = client.get(
        f"{settings.API_V1_STR}/courses/{"2f4f3e55-7615-4502-8b5c-398ce98bd113"}/rating",
    )
    assert response_review_create.status_code == 401
    assert response_get_review.status_code == 404
    assert response_get_rating.status_code == 404
