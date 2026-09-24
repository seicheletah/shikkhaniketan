document.addEventListener("DOMContentLoaded", () => {

    const API_BASE = "http://127.0.0.1:8000/api/v1";
    const token = localStorage.getItem("access_token");

    if (!token) {
        window.location.href = "login.html";
        return;
    }

    // ================= ELEMENTS =================
    const userName = document.getElementById("studentUserName");
    const profileImg = document.getElementById("studentProfileImg");
    const accountDetails = document.getElementById("accountDetails");

    const courseGrid = document.querySelector(".course-grid");
    const searchInput = document.querySelector(".search-box input");

    // Sidebar buttons
    const homeBtn = document.getElementById("homeBtn");
    const coursesBtn = document.getElementById("coursesBtn");
    const quizBtn = document.getElementById("quizBtn");
    const settingsBtn = document.getElementById("settingsBtn");

    // Sections
    const homeSection = document.getElementById("homeSection");
    const coursesSection = document.getElementById("coursesSection");
    const quizSection = document.getElementById("quizSection");
    const settingsSection = document.getElementById("settingsSection");

    let allCourses = [];

    // ================= SHOW SECTION =================
    function showSection(section) {

        [homeSection, coursesSection, quizSection, settingsSection].forEach(sec => {
            if (sec) sec.style.display = "none";
        });

        if (section) section.style.display = "block";
    }

    // ================= PROFILE =================
    async function loadStudentProfile() {

        try {

            const res = await fetch(`${API_BASE}/students/me`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json"
                }
            });

            if (res.status === 401) {
                localStorage.clear();
                location.href = "login.html";
                return;
            }

            const data = await res.json();

            const fullName =
                `${data.first_name || ""} ${data.last_name || ""}`.trim();

            if (userName) userName.textContent = fullName;

            if (profileImg && data.profile_pic)
                profileImg.src = data.profile_pic;

            if (accountDetails) {

                accountDetails.innerHTML = `
                    <div><b>Name:</b> ${fullName}</div>
                    <div><b>Email:</b> ${data.user?.email_id || ""}</div>
                    <div><b>Phone:</b> ${data.phone_no || ""}</div>
                    <div><b>Gender:</b> ${data.gender || ""}</div>
                    <div><b>DOB:</b> ${data.date_of_birth || ""}</div>
                    <div><b>Address:</b> ${data.address || ""}</div>
                    <div><b>About:</b> ${data.about || ""}</div>
                `;
            }

        } catch (err) {
            console.error(err);
        }
    }

    // ================= LOAD COURSES =================
    async function loadCourses() {

        try {

            const res = await fetch(`${API_BASE}/courses/search?q=&limit=50&offset=0`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json"
                }
            });

            console.log("Course Status:", res.status);

            if (!res.ok) return;

            const data = await res.json();

            allCourses = Array.isArray(data) ? data : [];

            renderCourses(allCourses);

        } catch (err) {
            console.error(err);
        }
    }

    // ================= RENDER COURSES =================
    function renderCourses(courses) {

        if (!courseGrid) return;

        courseGrid.innerHTML = "";

        if (courses.length === 0) {
            courseGrid.innerHTML = "<p>No course found.</p>";
            return;
        }

        courses.forEach(course => {

            const card = document.createElement("div");
            card.className = "course-card";

            card.innerHTML = `
                <div class="course-image">
                    <img src="https://placehold.co/300x180?text=Course" alt="">
                </div>

                <div class="course-content">

                    <h3>${course.course_name}</h3>

                    <p>${course.course_details}</p>

                    <span>${course.course_language}</span>

                    <div class="price">
                        ${course.course_paid ? `₹${course.course_price}` : "Free"}
                    </div>

                    <button class="btn-continue">
                        Continue Learning
                    </button>

                </div>
            `;

            // Whole card click
            card.addEventListener("click", () => {
                window.location.href = `course_details.html?id=${course.id}`;
            });

            // Button click
            card.querySelector(".btn-continue").addEventListener("click", (e) => {
                e.stopPropagation();
                window.location.href = `course_details.html?id=${course.id}`;
            });

            courseGrid.appendChild(card);

        });
    }

    // ================= SEARCH =================
    if (searchInput) {

        searchInput.addEventListener("input", () => {

            const value = searchInput.value.toLowerCase();

            const filtered = allCourses.filter(course =>
                (course.course_name || "").toLowerCase().includes(value)
            );

            renderCourses(filtered);

        });

    }

    // ================= SIDEBAR =================
    if (homeBtn)
        homeBtn.onclick = () => showSection(homeSection);

    if (coursesBtn)
        coursesBtn.onclick = () => {
            showSection(coursesSection);
            loadCourses();
        };

    if (quizBtn)
        quizBtn.onclick = () => showSection(quizSection);

    if (settingsBtn)
        settingsBtn.onclick = () => {
            showSection(settingsSection);
            loadStudentProfile();
        };

    