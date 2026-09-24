document.addEventListener("DOMContentLoaded", () => {

    const API = "http://127.0.0.1:8000/api/v1";
    const token = localStorage.getItem("access_token");

    if (!token) {
        location.href = "login.html";
        return;
    }

    // ---------------- ELEMENTS ----------------

    const navItems = document.querySelectorAll(".nav-item");
    const sections = document.querySelectorAll(".page-section");

    const teacherName = document.getElementById("teacherUserName");
    const teacherImg = document.getElementById("teacherProfileImg");

    const publishBtn = document.getElementById("publishCourseBtn");
    const updateBtn = document.getElementById("openUpdateProfile");
    const searchInput = document.getElementById("courseSearch");

    const courseList = document.getElementById("courseList");

    const templateCard =
        courseList.querySelector("[data-course-card]");

    let teacher = {};
    let allCourses = [];

    // ---------------- HEADERS ----------------

    function headers() {
        return {
            Authorization: `Bearer ${token}`,
            Accept: "application/json"
        };
    }

    // ---------------- NAV ----------------

    navItems.forEach(item => {

        item.onclick = e => {

            e.preventDefault();

            const page = item.dataset.page;

            if (page === "logout") {

                localStorage.clear();
                location.href = "login.html";
                return;

            }

            navItems.forEach(n => n.classList.remove("active"));
            sections.forEach(s => s.classList.remove("active"));

            item.classList.add("active");

            const section = document.getElementById(page);

            if (section)
                section.classList.add("active");

        };

    });

    // ---------------- PROFILE ----------------

    async function loadProfile() {

        const res = await fetch(API + "/teachers/me", {
            headers: headers()
        });

        if (res.status === 401) {
            localStorage.clear();
            location.href = "login.html";
            return;
        }

        teacher = await res.json();

        const fullName =
            `${teacher.first_name || ""} ${teacher.last_name || ""}`.trim();

        teacherName.textContent = fullName || "Teacher";

        if (teacher.profile_pic)
            teacherImg.src = teacher.profile_pic;

        set("teacherFirstName", teacher.first_name);
        set("teacherLastName", teacher.last_name);
        set("teacherEmail", teacher.user?.email_id);
        set("teacherPhone", teacher.phone_no);
        set("teacherGender", teacher.gender);
        set("teacherDob", teacher.date_of_birth);
        set("teacherAddress", teacher.address);
        set("teacherAbout", teacher.about);

    }

    function set(id, value) {

        const el = document.getElementById(id);

        if (el)
            el.textContent = value || "-";

    }

    // ---------------- COURSES ----------------

    async function loadCourses() {

        const res = await fetch(API + "/teachers/me/courses", {
            headers: headers()
        });

        if (!res.ok) return;

        const data = await res.json();

        allCourses = Array.isArray(data)
            ? data
            : (data.courses || []);

        renderCourses(allCourses);

    }

    function renderCourses(courses) {

        courseList.innerHTML = "";

        if (!courses.length) return;

        courses.forEach(course => {

            const card = templateCard.cloneNode(true);

            card.style.display = "";

            card.querySelector("[data-course-name]").textContent =
                course.course_name;

            card.querySelector("[data-course-details]").textContent =
                course.course_details;

            card.querySelector("[data-course-language]").textContent =
                course.course_language;

            card.querySelector("[data-course-price]").textContent =
                course.course_paid
                    ? `${course.course_price_currency} ${course.course_price}`
                    : "Free";

            // Edit Button
            const editBtn =
                card.querySelector("[data-edit-course]");

            editBtn.onclick = e => {

                e.stopPropagation();

                alert("Edit Course ID : " + course.id);

            };

            // Whole Card Click
            card.onclick = () => showCourse(course);

            courseList.appendChild(card);

        });

    }

    // ---------------- SAME PAGE DETAILS ----------------

    function showCourse(course) {

        const cards =
            courseList.querySelectorAll("[data-course-card]");

        cards.forEach(c => c.style.display = "none");

        const detailCard = templateCard.cloneNode(true);

        detailCard.style.display = "";

        detailCard.querySelector("[data-course-name]").textContent =
            course.course_name;

        detailCard.querySelector("[data-course-details]").textContent =
            course.course_details;

        detailCard.querySelector("[data-course-language]").textContent =
            course.course_language;

        detailCard.querySelector("[data-course-price]").textContent =
            course.course_paid
                ? `${course.course_price_currency} ${course.course_price}`
                : "Free";

        const editBtn =
            detailCard.querySelector("[data-edit-course]");

        editBtn.textContent = "Back";

        editBtn.onclick = e => {

            e.stopPropagation();

            renderCourses(allCourses);

        };

        courseList.appendChild(detailCard);

    }

    // ---------------- SEARCH ----------------

    searchInput?.addEventListener("input", () => {

        const text =
            searchInput.value.toLowerCase();

        const filtered =
            allCourses.filter(c =>
                (c.course_name || "")
                    .toLowerCase()
                    .includes(text)
            );

        renderCourses(filtered);

    });

    // ---------------- BUTTONS ----------------

    publishBtn?.addEventListener("click", () => {

        location.href = "add_course.html";

    });

    updateBtn?.addEventListener("click", () => {

        location.href = "update_profile.html";

    });

    // ---------------- INIT ----------------

    loadProfile();
    loadCourses();

});