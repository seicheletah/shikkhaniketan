document.addEventListener("DOMContentLoaded", () => {

    const API_BASE = "http://127.0.0.1:8000/api/v1";
    const token = localStorage.getItem("access_token");

    if (!token) {
        window.location.href = "login.html";
        return;
    }

    const userName = document.getElementById("studentUserName");
    const profileImg = document.getElementById("studentProfileImg");
    const accountDetails = document.getElementById("accountDetails");
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

        const fullName = `${data.first_name || ""} ${data.last_name || ""}`.trim();

        userName.textContent = fullName;

        if (data.profile_pic) {
            profileImg.src = data.profile_pic;
        }

        accountDetails.innerHTML = `
            <div><b>Name:</b> ${fullName}</div>
            <div><b>Email:</b> ${data.user?.email_id || ""}</div>
            <div><b>Phone:</b> ${data.phone_no || ""}</div>
            <div><b>Gender:</b> ${data.gender || ""}</div>
            <div><b>Date of Birth:</b> ${data.date_of_birth || ""}</div>
            <div><b>Address:</b> ${data.address || ""}</div>
            <div><b>About:</b> ${data.about || ""}</div>
        `;
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

        allCourses = Array.isArray(data) ? data : (data.courses || []);

        renderCourses(allCourses);
    }

    // ================= RENDER =================
    function renderCourses(courses) {

        courseGrid.innerHTML = "";

        if (courses.length === 0) {
            courseGrid.innerHTML = "<p>No enrolled courses.</p>";
            return;
        }

        courses.forEach(course => {

            const progress = course.progress || 0;
            const thumbnail = course.thumbnail_url || "images/test_thumbnail.jpg";

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
                        <span class="percentage">${progress}%</span>
                    </div>

                    <div class="progress-bar">
                        <div class="progress" style="width:${progress}%"></div>
                    </div>
                </div>

                <button class="btn-continue">
                    Continue Learning
                    <i class="fa-solid fa-arrow-right"></i>
                </button>
            `;

            card.querySelector(".btn-continue").onclick = () => {
                window.location.href = `course_view.html?course=${course.id}`;
            };

            courseGrid.appendChild(card);
        });
    }

    // ================= SEARCH =================
    searchInput.addEventListener("input", () => {

        const value = searchInput.value.toLowerCase();

        const filtered = allCourses.filter(course =>
            (course.course_name || "").toLowerCase().includes(value)
        );

        renderCourses(filtered);
    });

    // ================= SIDEBAR =================
    document.querySelectorAll(".nav-item").forEach(item => {

        item.addEventListener("click", e => {

            e.preventDefault();

            const page = item.dataset.page;

            document.querySelectorAll(".page-section").forEach(sec => {
                sec.classList.remove("active");
            });

            document.querySelectorAll(".nav-item").forEach(nav => {
                nav.classList.remove("active");
            });

            item.classList.add("active");

            if (page === "courses") {
                document.getElementById("courses").classList.add("active");
                loadCourses();
            }

            if (page === "quiz") {
                document.getElementById("quiz").classList.add("active");
            }

            if (page === "settings") {
                document.getElementById("settings").classList.add("active");
                loadStudentProfile();
            }

            if (page === "logout") {
                localStorage.clear();
                window.location.href = "login.html";
            }

        });

    });

    // Initial Load
    loadStudentProfile();
    loadCourses();

});