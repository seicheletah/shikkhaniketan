document.addEventListener("DOMContentLoaded", async () => {

    const API = "http://127.0.0.1:8000/api/v1";

    const token = localStorage.getItem("access_token");
    const role = localStorage.getItem("userRole");

    // Account না থাকলে Course View খুলবে না
    if (!token || role !== "student") {
        window.location.href = "sign_up.html";
        return;
    }

    const courseId = new URLSearchParams(window.location.search).get("course");

    const topBar = document.querySelector(".top-bar");
    const contentBody = document.querySelector(".content-body");

    const video = document.querySelector("#videoPlayerBox video");
    const pdf = document.querySelector("#pdfReaderBox iframe");

    const title = document.querySelector("#overviewTab h3");
    const overview = document.querySelector("#overviewTab p");
    const reviewBox = document.getElementById("reviewsTab");

    const userName = document.querySelector(".user-name");
    const userImg = document.querySelector(".user-profile img");

    // ================= STUDENT PROFILE =================
    async function loadStudent() {
        try {
            const res = await fetch(`${API}/students/me`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json"
                }
            });

            if (!res.ok) return;

            const student = await res.json();

            userName.textContent =
                `${student.first_name || ""} ${student.last_name || ""}`.trim();

            if (student.profile_pic) {
                userImg.src = student.profile_pic;
            }

        } catch (err) {
            console.log(err);
        }
    }

    // ================= LOAD COURSE =================
    async function loadCourse() {

        try {

            const res = await fetch(`${API}/courses/${courseId}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json"
                }
            });

            if (!res.ok) return;

            const course = await res.json();

            title.textContent = course.course_name;
            overview.textContent = course.course_details;

            loadMedia();
            loadReviews();

        } catch (err) {
            console.log(err);
        }
    }

    // ================= VIDEO / PDF =================
    async function loadMedia() {

        try {

            const res = await fetch(
                `${API}/courses/${courseId}/media/resource/access`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: "application/json"
                    }
                }
            );

            if (!res.ok) return;

            const media = await res.json();

            if (!Array.isArray(media)) return;

            media.forEach(item => {

                if (item.media_type === "video") {
                    video.src = item.access_url;
                    video.load();
                }

                if (item.media_type === "document") {
                    pdf.src = item.access_url;
                }

            });

        } catch (err) {
            console.log(err);
        }
    }

    // ================= REVIEWS =================
    async function loadReviews() {

        try {

            const res = await fetch(`${API}/courses/${courseId}/review`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json"
                }
            });

            if (!res.ok) return;

            const reviews = await res.json();

            reviewBox.innerHTML = "<h3>Student Feedback</h3>";

            if (!reviews.length) {
                reviewBox.innerHTML += "<p>No reviews yet.</p>";
                return;
            }

            reviews.forEach(r => {

                reviewBox.innerHTML += `
                    <div class="review-item">
                        <div class="reviewer-header">
                            <strong>${r.student_name || "Student"}</strong>
                            <span class="rating">⭐ ${r.rating}/5</span>
                        </div>
                        <p>${r.review || ""}</p>
                    </div>
                `;

            });

        } catch (err) {
            console.log(err);
        }
    }

    // ================= SETTINGS =================
    async function showSettings() {

        topBar.style.display = "none";

        try {

            const res = await fetch(`${API}/students/me`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json"
                }
            });

            if (!res.ok) {
                contentBody.innerHTML = "<h2>No Profile Found</h2>";
                return;
            }

            const data = await res.json();

            contentBody.innerHTML = `
                <section class="settings-page">

                    <h2 style="margin-bottom:25px;">My Profile</h2>

                    <div class="account-card">

                        <div style="display:flex;align-items:center;gap:20px;margin-bottom:30px;">

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

        } catch (err) {
            console.log(err);
            contentBody.innerHTML = "<h2>No Profile Found</h2>";
        }
    }

    // ================= SIDEBAR =================
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
                location.href = "login.html";
            }

        });

    });

    loadStudent();
    loadCourse();

});

// ================= VIDEO / PDF TAB =================
function switchMedia(type) {

    document
        .getElementById("videoPlayerBox")
        .classList.toggle("hidden", type !== "video");

    document
        .getElementById("pdfReaderBox")
        .classList.toggle("hidden", type !== "pdf");

    document
        .querySelectorAll(".toggle-btn")
        .forEach(btn => btn.classList.remove("active"));

    document
        .querySelectorAll(".toggle-btn")[type === "video" ? 0 : 1]
        .classList.add("active");
}

// ================= OVERVIEW / REVIEW TAB =================
function switchTab(tab) {

    document
        .getElementById("overviewTab")
        .classList.toggle("hidden", tab !== "overview");

    document
        .getElementById("reviewsTab")
        .classList.toggle("hidden", tab !== "reviews");

    document
        .querySelectorAll(".tab-btn")
        .forEach(btn => btn.classList.remove("active"));

    document
        .querySelectorAll(".tab-btn")[tab === "overview" ? 0 : 1]
        .classList.add("active");
}