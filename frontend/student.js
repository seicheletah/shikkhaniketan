
document.addEventListener("DOMContentLoaded", () => {

    const API_BASE = "http://127.0.0.1:8000/api/v1";
    const token = localStorage.getItem("access_token");

    if (!token) {
        location.href = "login.html";
        return;
    }

    const topBar = document.querySelector(".top-bar");
    const courseGrid = document.getElementById("courseGrid");
    const searchInput = document.querySelector(".search-box input");

    let allCourses = [];

    // ================= PROFILE =================

    async function loadStudentProfile() {

        const res = await fetch(`${API_BASE}/students/me`, {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/json"
            }
        });

        const data = await res.json();

        const fullName =
            `${data.first_name || ""} ${data.last_name || ""}`.trim();

        // Top bar
        document.getElementById("studentUserName").textContent = fullName || "Student";

        if (data.profile_pic) {
            document.getElementById("studentProfileImg").src = data.profile_pic;
            document.getElementById("profilePhoto").src = data.profile_pic;
        }

        // Settings profile
        document.getElementById("profileName").textContent = fullName;
        document.getElementById("profileFirstName").textContent = data.first_name || "-";
        document.getElementById("profileLastName").textContent = data.last_name || "-";
        document.getElementById("profileEmail").textContent = data.user?.email_id || "-";
        document.getElementById("profilePhone").textContent = data.phone_no || "-";
        document.getElementById("profileGender").textContent = data.gender || "-";
        document.getElementById("profileDob").textContent = data.date_of_birth || "-";
        document.getElementById("profileAddress").textContent = data.address || "-";
        document.getElementById("profileAbout").textContent = data.about || "-";
    }

    // ================= ENROLLED COURSES =================

    async function loadCourses() {

        const res = await fetch(`${API_BASE}/students/me/enrolled-courses`, {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/json"
            }
        });

        if (!res.ok) {
            courseGrid.innerHTML = "<p>No enrolled courses.</p>";
            return;
        }

        const data = await res.json();

        allCourses = Array.isArray(data)
            ? data
            : (data.courses || []);

        renderCourses(allCourses);
    }

    // ================= RENDER COURSES =================

    function renderCourses(courses) {

        courseGrid.innerHTML = "";

        if (courses.length === 0) {
            courseGrid.innerHTML = "<p>No enrolled courses.</p>";
            return;
        }

        courses.forEach(course => {

            const progress = course.progress || 0;
            const thumbnail =
                course.thumbnail_url || "images/test_thumbnail.jpg";

            const card = document.createElement("div");
            card.className = "course-card";

            card.innerHTML = `
                <div class="course-image">
                    <img src="${thumbnail}" alt="Course">
                </div>

                <div class="card-body">
                    <h4>${course.course_name}</h4>

                    <div class="progress-info">
                        <span>Progress</span>
                        <span>${progress}%</span>
                    </div>

                    <div class="progress-bar">
                        <div class="progress" style="width:${progress}%"></div>
                    </div>
                </div>

                <button class="btn-continue">
                    Continue Learning
                </button>
            `;

            card.querySelector(".btn-continue").onclick = () => {
                location.href = `course_view.html?course=${course.id}`;
            };

            courseGrid.appendChild(card);
        });
    }

    // ================= SEARCH =================

    searchInput.addEventListener("input", () => {

        const value = searchInput.value.toLowerCase();

        const filtered = allCourses.filter(course =>
            (course.course_name || "")
                .toLowerCase()
                .includes(value)
        );

        renderCourses(filtered);
    });

    // ================= SIDEBAR =================

    document.querySelectorAll(".nav-item").forEach(item => {

        item.addEventListener("click", e => {

            e.preventDefault();

            const page = item.dataset.page;

            document.querySelectorAll(".nav-item")
                .forEach(nav => nav.classList.remove("active"));

            item.classList.add("active");

            document.querySelectorAll(".page-section")
                .forEach(sec => sec.classList.remove("active"));

            if (page === "courses") {

                topBar.classList.remove("hide-search");

                document
                    .getElementById("courses")
                    .classList.add("active");

                loadCourses();
            }

            if (page === "quiz") {

                topBar.classList.remove("hide-search");

                document
                    .getElementById("quiz")
                    .classList.add("active");
            }

            if (page === "settings") {

                topBar.classList.add("hide-search");

                document
                    .getElementById("settings")
                    .classList.add("active");

                loadStudentProfile();
            }

            if (page === "logout") {

                localStorage.clear();
                location.href = "login.html";
            }

        });

    });

    // Initial Load
    loadStudentProfile();
    loadCourses();

});

// ================= UPDATE PROFILE =================

const updateBtn = document.getElementById("updateProfileBtn");

if (updateBtn) {
    updateBtn.addEventListener("click", () => {
        window.location.href = "update_profile.html";
    });
}