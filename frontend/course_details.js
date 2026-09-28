document.addEventListener("DOMContentLoaded", () => {

    const API = "http://127.0.0.1:8000/api/v1";
    const token = localStorage.getItem("access_token");

    const courseId =
        new URLSearchParams(window.location.search).get("id") ||
        new URLSearchParams(window.location.search).get("course");

    if (!courseId) {
        alert("Course not found!");
        return;
    }

    const contentBody = document.querySelector(".content-body");
    const topBar = document.querySelector(".top-bar");

    // ---------- TAB ----------
    window.switchTab = function (tab) {

        document.getElementById("overviewTab").classList.add("hidden");
        document.getElementById("reviewsTab").classList.add("hidden");

        document.querySelectorAll(".tab-btn")
            .forEach(btn => btn.classList.remove("active"));

        if (tab === "overview") {
            document.getElementById("overviewTab").classList.remove("hidden");
            document.querySelectorAll(".tab-btn")[0].classList.add("active");
        } else {
            document.getElementById("reviewsTab").classList.remove("hidden");
            document.querySelectorAll(".tab-btn")[1].classList.add("active");
        }
    };

    // ---------- STUDENT ----------
    async function loadStudent() {

        if (!token) return;

        try {

            const res = await fetch(`${API}/students/me`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (!res.ok) return;

            const student = await res.json();

            const name = document.querySelector(".user-name");

            if (name) {
                name.textContent =
                    `${student.first_name} ${student.last_name}`;
            }

        } catch (e) {
            console.log(e);
        }
    }

    // ---------- COURSE ----------
    async function loadCourse() {

        try {

            const headers = { Accept: "application/json" };

            if (token) {
                headers.Authorization = `Bearer ${token}`;
            }

            const res = await fetch(`${API}/courses/${courseId}`, {
                headers
            });

            if (!res.ok) {
                alert("Course load failed");
                return;
            }

            const course = await res.json();

            document.querySelector(".course-title").textContent =
                course.course_name;

            document.querySelector("#overviewTab p").textContent =
                course.course_details;

            const price = Number(course.course_price || 0);
            const gst = price * 0.18;
            const total = price + gst;

            const rows = document.querySelectorAll(".price-row strong");

            rows[0].textContent = `₹${price}`;
            rows[1].textContent = `₹${gst.toFixed(2)}`;
            rows[2].textContent = `₹${total.toFixed(2)}`;

            loadReviews();

        } catch (e) {
            console.log(e);
        }
    }

    // ---------- REVIEWS ----------
    async function loadReviews() {

        try {

            const headers = { Accept: "application/json" };

            if (token) {
                headers.Authorization = `Bearer ${token}`;
            }

            const res = await fetch(`${API}/courses/${courseId}/review`, {
                headers
            });

            if (!res.ok) return;

            const reviews = await res.json();

            const box = document.getElementById("reviewsTab");
            box.innerHTML = "<h3>Student Reviews</h3>";

            if (!reviews.length) {
                box.innerHTML += "<p>No reviews yet.</p>";
                return;
            }

            reviews.forEach(r => {

                box.innerHTML += `
                    <div class="review-item">
                        <strong>${r.student_name || "Student"}</strong>
                        <span class="rating">⭐ ${r.rating}/5</span>
                        <p>${r.review || ""}</p>
                    </div>
                `;

            });

        } catch (e) {
            console.log(e);
        }
    }

    // ---------- PURCHASE ----------
    window.openCourseView = function () {

        const accessToken = localStorage.getItem("access_token");

        if (accessToken) {
            window.location.href = `course_view.html?course=${courseId}`;
        } else {
            window.location.href = "sign_up.html";
        }

    };

    // ---------- SETTINGS ----------
    async function showSettings() {

        if (topBar) topBar.style.display = "none";

        if (!token) {
            contentBody.innerHTML = "<h2>No profile found</h2>";
            return;
        }

        try {

            const res = await fetch(`${API}/students/me`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (!res.ok) {
                contentBody.innerHTML = "<h2>No profile found</h2>";
                return;
            }

            const data = await res.json();

            contentBody.innerHTML = `
                <section class="settings-page">

                    <h2 style="margin-bottom:20px;">Profile Details</h2>

                    <div class="account-card">

                        <div style="display:flex;align-items:center;gap:20px;margin-bottom:25px;">

                            <img src="${data.profile_pic || "https://i.pravatar.cc/150?img=68"}"
                                 style="width:90px;height:90px;border-radius:50%;object-fit:cover;">

                            <div>
                                <h3>${data.first_name || ""} ${data.last_name || ""}</h3>
                                <p>${data.user?.email_id || "-"}</p>
                            </div>

                        </div>

                        <div class="profile-grid">

                            <div class="input-box">
                                <label>First Name</label>
                                <p>${data.first_name || "-"}</p>
                            </div>

                            <div class="input-box">
                                <label>Last Name</label>
                                <p>${data.last_name || "-"}</p>
                            </div>

                            <div class="input-box">
                                <label>Email</label>
                                <p>${data.user?.email_id || "-"}</p>
                            </div>

                            <div class="input-box">
                                <label>Phone</label>
                                <p>${data.phone_no || "-"}</p>
                            </div>

                            <div class="input-box">
                                <label>Gender</label>
                                <p>${data.gender || "-"}</p>
                            </div>

                            <div class="input-box">
                                <label>Date of Birth</label>
                                <p>${data.date_of_birth || "-"}</p>
                            </div>

                            <div class="input-box full">
                                <label>Address</label>
                                <p>${data.address || "-"}</p>
                            </div>

                            <div class="input-box full">
                                <label>About</label>
                                <p>${data.about || "-"}</p>
                            </div>

                        </div>

                    </div>

                </section>
            `;

        } catch (e) {
            console.log(e);
            contentBody.innerHTML = "<h2>No profile found</h2>";
        }

    }

    // ---------- SIDEBAR ----------
    document.querySelectorAll(".nav-item").forEach(item => {

        item.addEventListener("click", (e) => {

            e.preventDefault();

            const text = item.textContent.trim().toLowerCase();

            if (text === "courses") {
                location.reload();
            }

            if (text === "settings") {
                showSettings();
            }

            if (text === "logout") {
                localStorage.clear();
                window.location.href = "login.html";
            }

        });

    });

    // ---------- INIT ----------
    loadStudent();
    loadCourse();

});