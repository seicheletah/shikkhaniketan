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
    request_body_user_teacher_creation_male = {
        "email_id": "test.teacher.male@email.com",
        "role": "teacher",
        "hashed_password": "12345",
    }
    response_body_user_teacher_creation_male = {
        "email_id": "test.teacher.male@email.com",
        "role": "teacher",
    }

    request_body_user_teacher_login_male = {
        "username": "test.teacher.male@email.com",
        "password": "12345",
    }

    request_body_user_teacher_login_male_fail = {
        "username": "test.teacher.male@email.com",
        "password": "1234",
    }

    request_body_user_teacher_update_male = {
        "email_id": "test.teacher.male_update@email.com",
        "hashed_password": "123456",
    }

    request_body_teacher_profile_creation_male = {
        "first_name": "John",
        "last_name": "Doe",
        "phone_no": "1555555019",
        "gender": "M",
        "date_of_birth": "1995-06-15",
        "address": "456 Oak Avenue, Metropolis, NY",
        "about": "Software engineer focused on building scalable cloud applications.",
    }

    request_body_teacher_profile_creation_female = {
        "first_name": "Jane",
        "last_name": "Doe",
        "phone_no": "2556655019",
        "gender": "F",
        "date_of_birth": "1997-08-22",
        "address": "789 Pine Road, Star City, CA",
        "about": "UX/UI designer passionate about creating intuitive digital experiences.",
    }

    request_body_teacher_profile_update_male = {
        "phone_no": "1555555020",
        "address": "Washed street",
        "about": "Farmer",
    }

    request_body_teacher_profile_update_same_phno_male = {
        "phone_no": "1555555019",
    }

    request_body_user_teacher_creation_female = {
        "email_id": "test.teacher.female@email.com",
        "role": "teacher",
        "hashed_password": "12345",
    }

    request_body_user_teacher_login_female = {
        "username": "test.teacher.female@email.com",
        "password": "12345",
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
        "phone_no": "1555555019",
        "gender": "M",
        "date_of_birth": "1995-06-15",
        "address": "456 Oak Avenue, Metropolis, NY",
        "about": "Software engineer focused on building scalable cloud applications.",
    }

    request_body_student_profile_update_male = {
        "phone_no": "1555555020",
        "address": "Washed street",
        "about": "Farmer",
    }

    request_body_student_profile_update_same_phno_male = {
        "phone_no": "1555555019",
    }

    request_body_student_profile_creation_female = {
        "first_name": "Jane",
        "last_name": "Doe",
        "phone_no": "2556655019",
        "gender": "F",
        "date_of_birth": "1997-08-22",
        "address": "789 Pine Road, Star City, CA",
        "about": "UX/UI designer passionate about creating intuitive digital experiences.",
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


class CourseSampleData:
    request_body_course_create_male = {
        "course_name": "Mastering Docker & Kubernetes",
        "course_details": "A comprehensive guide to containerization and orchestration.",
        "course_language": "english",
        "course_resource_type": "video",
        "course_paid": True,
        "course_price": 899,
        "course_tags": ["mba"],
    }

    request_body_course_update_male = {
        "course_language": "bengali",
        "course_paid": True,
        "course_price": 499,
        "course_tags": ["bsc"],
    }

    request_body_course_thumbnail_upload_male = {
        "category": "thumbnail",
        "media_type": "image/jpeg",
        "file_name": "sampleimage",
        "file_extension": "jpg",
    }

    request_body_course_resource_upload_male = {
        "category": "resource",
        "media_type": "video/mp4",
        "file_name": "samplevideo",
        "file_extension": "mp4",
    }


class ReviewSampleData:
    request_body_review_create = {"comment": "bad", "rate": 1}

    request_body_review_update = {"comment": "good", "rate": 5}
