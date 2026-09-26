document.addEventListener("DOMContentLoaded", async () => {

    const API = "http://127.0.0.1:8000/api/v1";
    const token = localStorage.getItem("access_token");

    if (!token) {
        window.location.href = "login.html";
        return;
    }

    const courseId = new URLSearchParams(window.location.search).get("course");

    const topBar = document.querySelector(".top-bar");
    const contentBody = document.querySelector(".content-body");

    const video = document.querySelector("#videoPlayerBox video");
    const pdf = document.querySelector("#pdfReaderBox iframe");

    const title = document.querySelector(".course-title");
    const overview = document.querySelector("#overviewTab p");
    const reviewBox = document.getElementById("reviewsTab");

    const userName = document.querySelector(".user-name");
    const userImg = document.querySelector(".user-profile img");

    // ================= STUDENT =================
    async function loadStudent() {

        const res = await fetch(`${API}/students/me`, {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/json"
            }
        });

        if (!res.ok) return;

        const me = await res.json();

        userName.textContent =
            `${me.first_name || ""} ${me.last_name || ""}`.trim();

        if (me.profile_pic) {
            userImg.src = me.profile_pic;
        }
    }

    // ================= COURSE =================
    async function loadCourse() {

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
    }

    // ================= MEDIA =================
    async function loadMedia() {

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
            }

            if (item.media_type === "document") {
                pdf.src = item.access_url;
            }

        });
    }

    // ================= REVIEWS =================
    async function loadReviews() {

        const res = await fetch(`${API}/courses/${courseId}/review`, {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/json"
            }
        });

        if (!res.ok) return;

        const reviews = await res.json();

        reviewBox.innerHTML = "<h3>Student Reviews</h3>";

        if (reviews.length === 0) {
            reviewBox.innerHTML += "<p>No reviews yet.</p>";
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

        reviewBox.innerHTML += `
            <div style="margin-top:20px">
                <textarea id="reviewText"
                    placeholder="Write your review"
                    style="width:100%;height:90px;padding:10px;border-radius:8px"></textarea>

                <input id="rating"
                    type="number"
                    min="1"
                    max="5"
                    value="5"
                    style="width:80px;margin-top:10px">

                <button id="submitReviewBtn"
                    style="padding:10px 20px;margin-left:10px;background:#0f766e;color:#fff;border:none;border-radius:8px">
                    Submit
                </button>
            </div>
        `;

        document
            .getElementById("submitReviewBtn")
            .addEventListener("click", submitReview);
    }

    // ================= SUBMIT REVIEW =================
    async function submitReview() {

        const review = document.getElementById("reviewText").value;
        const rating = Number(document.getElementById("rating").value);

        await fetch(`${API}/courses/${courseId}/review`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                review,
                rating
            })
        });

        alert("Review submitted");
        loadReviews();
    }

    // ================= SETTINGS =================
    async function showSettings() {

        // Hide Search Bar
        topBar.style.display = "none";

        const res = await fetch(`${API}/students/me`, {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/json"
            }
        });

        if (!res.ok) {
            contentBody.innerHTML = "<h2>Unable to load profile</h2>";
            return;
        }

        const data = await res.json();

        contentBody.innerHTML = `
            <section class="settings-page">

                <h2 style="margin-bottom:20px;">Account Details</h2>

                <div class="account-card">

                    <div style="display:flex;align-items:center;gap:20px;margin-bottom:25px;">

                        <img src="${data.profile_pic || "https://i.pravatar.cc/150?img=32"}"
                             style="width:90px;height:90px;border-radius:50%;object-fit:cover;">

                        <div>
                            <h3>${data.first_name || "-"} ${data.last_name || ""}</h3>
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
                            <label>About Me</label>
                            <p>${data.about || "-"}</p>
                        </div>

                    </div>

                    <button onclick="location.href='update_profile.html'"
                        style="margin-top:25px;padding:12px 24px;background:#0f766e;color:#fff;border:none;border-radius:10px;cursor:pointer;">
                        Update Profile
                    </button>

                </div>

            </section>
        `;
    }

    // ================= SIDEBAR =================
    document.querySelectorAll(".nav-item").forEach(item => {

        item.addEventListener("click", e => {

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

// ================= VIDEO / PDF =================
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

// ================= OVERVIEW / REVIEW =================
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