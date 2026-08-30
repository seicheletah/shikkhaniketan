import pytest
import hmac
import hashlib
from ..core.config import settings
from ..models import PurchaseOrderResponse, PurchaseVerify
from .sample_test_data import *
from sqlmodel import select


# create a purchase order by course ID success test
def test_purchase_course_success(
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
    PurchaseOrderResponse(**response_purchase_order.json())
    assert response_purchase_order.status_code == 200


# verify a payment signature success test
def generate_valid_signature(order_id, payment_id, secret):
    msg = f"{order_id}|{payment_id}".encode("utf-8")
    return hmac.new(secret.encode("utf-8"), msg, hashlib.sha256).hexdigest()


def test_verify_course_success(client, student_profile, teacher_profile, course_create):
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
    response_verify_purchase_wrong_body_fail = client.post(
        f"{settings.API_V1_STR}/courses/verify-payment",
        json=UserSampleData.request_body_wrong_model,
        headers={"Authorization": f"Bearer {student_profile_response["token"]}"},
    )
    request_body_tampered = {
        "razorpay_order_id": response_purchase_order.json()["id"],
        "razorpay_payment_id": "pay_FG4ZdRK8ZnXC3k",
        "razorpay_signature": valid_signature,
        "course_id": response_course_create.json()["id"],
    }
    response_verify_purchase_tampered_body_fail = client.post(
        f"{settings.API_V1_STR}/courses/verify-payment",
        json=request_body_tampered,
        headers={"Authorization": f"Bearer {student_profile_response["token"]}"},
    )
    response_verify_purchase = client.post(
        f"{settings.API_V1_STR}/courses/verify-payment",
        json=request_body,
        headers={"Authorization": f"Bearer {student_profile_response["token"]}"},
    )
    assert response_verify_purchase_wrong_body_fail.status_code == 422
    assert (
        response_verify_purchase_wrong_body_fail.json()["detail"][0]["msg"]
        == "Field required"
    )
    assert response_verify_purchase_tampered_body_fail.status_code == 400
    assert response_verify_purchase.status_code == 200
    assert response_verify_purchase.json()["detail"] == "success"


# access without authorization
def test_access_without_login(client):
    response_purchase_order = client.post(
        f"{settings.API_V1_STR}/courses/{"2f4f3e55-7615-4502-8b5c-398ce98bd113"}/purchase",
    )
    response_verify_purchase = client.post(
        f"{settings.API_V1_STR}/courses/verify-payment",
    )
    assert response_purchase_order.status_code == 401
    assert response_verify_purchase.status_code == 401
