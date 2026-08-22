class UserSampleData:
    request_body_wrong_model = {
        "random": "test.user@email.com",
        "ran_dom": "12345",
    }


class AdminSampleData:
    request_body_user_admin_creation = {
        "email_id": "test.admin@email.com",
        "role": "admin",
        "hashed_password": "12345",
    }

    request_body_user_admin_login = {
        "username": "test.admin@email.com",
        "password": "12345",
    }


class TeacherSampleData:
    request_body_user_teacher_creation = {
        "email_id": "test.teacher@email.com",
        "role": "teacher",
        "hashed_password": "12345",
    }
    response_body_user_teacher_creation = {
        "email_id": "test.teacher@email.com",
        "role": "teacher",
    }

    request_body_user_teacher_login = {
        "username": "test.teacher@email.com",
        "password": "12345",
    }

    request_body_user_teacher_login_fail = {
        "username": "test.teacher@email.com",
        "password": "1234",
    }

    request_body_user_teacher_update = {
        "email_id": "test.teacher_update@email.com",
        "hashed_password": "123456",
    }


class StudentSampleData:
    request_body_user_student_creation_male = {
        "email_id": "test.student.male@email.com",
        "role": "student",
        "hashed_password": "12345",
    }

    response_body_user_student_creation_male = {
        "email_id": "test.student.male@email.com",
        "role": "student",
    }

    request_body_user_student_login_male = {
        "username": "test.student.male@email.com",
        "password": "12345",
    }

    request_body_user_student_login_male_fail = {
        "username": "test.student.male@email.com",
        "password": "1234",
    }

    request_body_user_no_student_login_fail = {
        "username": "test.nostudent@email.com",
        "password": "12345",
    }

    request_body_user_student_update_male = {
        "email_id": "test.student.male_update@email.com",
        "hashed_password": "123456",
    }

    request_body_student_profile_creation_male = {
        "first_name": "John",
        "last_name": "Doe",
        "phone_no": "+15555550199",
        "gender": "M",
        "date_of_birth": "1995-06-15",
        "address": "456 Oak Avenue, Metropolis, NY",
        "about": "Software engineer focused on building scalable cloud applications.",
        "profile_photo": "https://example.com",
    }

    request_body_student_profile_update_male = {
        "phone_no": "+15555550200",
        "address": "Washed street",
        "about": "Farmer",
    }

    request_body_student_profile_update_same_phno_male = {
        "phone_no": "+15555550144",
    }

    request_body_student_profile_creation_female = {
        "first_name": "Jane",
        "last_name": "Doe",
        "phone_no": "+15555550144",
        "gender": "F",
        "date_of_birth": "1997-08-22",
        "address": "789 Pine Road, Star City, CA",
        "about": "UX/UI designer passionate about creating intuitive digital experiences.",
        "profile_photo": "https://example.com",
    }

    request_body_user_student_creation_female = {
        "email_id": "test.student.female@email.com",
        "role": "student",
        "hashed_password": "12345",
    }

    request_body_user_student_login_female = {
        "username": "test.student.female@email.com",
        "password": "12345",
    }
