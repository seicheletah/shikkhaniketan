class UserSampleData:
    request_body_wrong_model = {
        "random": "test.user@email.com",
        "ran_dom": "12345",
    }


class AdminSampleData:
    request_body_admin_creation = {
        "email_id": "test.admin@email.com",
        "role": "admin",
        "hashed_password": "12345",
    }

    request_body_admin_login = {
        "username": "test.admin@email.com",
        "password": "12345",
    }


class TeacherSampleData:
    request_body_teacher_creation = {
        "email_id": "test.teacher@email.com",
        "role": "teacher",
        "hashed_password": "12345",
    }
    response_body_teacher_creation = {
        "email_id": "test.teacher@email.com",
        "role": "teacher",
    }

    request_body_teacher_login = {
        "username": "test.teacher@email.com",
        "password": "12345",
    }

    request_body_teacher_login_fail = {
        "username": "test.teacher@email.com",
        "password": "1234",
    }

    request_body_teacher_update = {
        "email_id": "test.teacher_update@email.com",
        "hashed_password": "123456",
    }


class StudentSampleData:
    request_body_student_creation = {
        "email_id": "test.student@email.com",
        "role": "student",
        "hashed_password": "12345",
    }

    response_body_student_creation = {
        "email_id": "test.student@email.com",
        "role": "student",
    }

    request_body_student_login = {
        "username": "test.student@email.com",
        "password": "12345",
    }

    request_body_student_login_fail = {
        "username": "test.student@email.com",
        "password": "1234",
    }

    request_body_no_student_login_fail = {
        "username": "test.nostudent@email.com",
        "password": "12345",
    }

    request_body_student_update = {
        "email_id": "test.student_update@email.com",
        "hashed_password": "123456",
    }
