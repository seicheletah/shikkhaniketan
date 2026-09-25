document.addEventListener("DOMContentLoaded", async () => {

    const API = "http://127.0.0.1:8000/api/v1";
    const token = localStorage.getItem("access_token");

    if (!token) {
        window.location.href = "login.html";
        return;
    }

    const courseId = new URLSearchParams(window.location.search).get("course");

    const video = document.querySelector("#videoPlayerBox video");
    const pdf = document.querySelector("#pdfReaderBox iframe");
    const overview = document.querySelector("#overviewTab p");
    const title = document.querySelector("#overviewTab h3");
    const reviewBox = document.getElementById("reviewsTab");
    const userName = document.querySelector(".user-name");
    const contentBody = document.querySelector(".content-body");

    // ========= STUDENT PROFILE =========
    const meRes = await fetch(`${API}/students/me`, {
        headers: { Authorization: `Bearer ${token}` }
    });

    const me = await meRes.json();
    userName.textContent = `${me.first_name} ${me.last_name}`;

    // ========= LOAD COURSE =========
    async function loadCourse() {

        const res = await fetch(`${API}/courses/${courseId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        const course = await res.json();

        title.textContent = course.course_name;
        overview.textContent = course.course_details;

        loadMedia();
        loadReviews();
    }

    // ========= VIDEO & PDF =========
    async function loadMedia() {

        const res = await fetch(`${API}/courses/${courseId}/media/resource/access`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        const media = await res.json();

        media.forEach(item => {

            if (item.media_type === "video") {
                video.src = item.access_url;
            }

            if (item.media_type === "document") {
                pdf.src = item.access_url;
            }

        });

    }

    // ========= REVIEWS =========
    async function loadReviews() {

        const res = await fetch(`${API}/courses/${courseId}/review`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        const reviews = await res.json();

        reviewBox.innerHTML = `<h3>Student Feedback</h3>`;

        if (reviews.length === 0) {
            reviewBox.innerHTML += `<p>No reviews yet.</p>`;
        }

        reviews.forEach(r => {

            reviewBox.innerHTML += `
                <div class="review-item">
                    <div class="reviewer-header">
                        <strong>${r.student_name || "Student"}</strong>
                        <span class="rating">⭐ ${r.rating}/5</span>
                    </div>
                    <p>${r.review}</p>
                </div>
            `;

        });

        reviewBox.innerHTML += `
            <div style="margin-top:20px">
                <textarea id="reviewText"
                    placeholder="Write your review"
                    style="width:100%;height:90px;padding:10px"></textarea>

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

    // ========= SUBMIT REVIEW =========
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

    // ========= SETTINGS =========
    async function showSettings() {

        const res = await fetch(`${API}/students/me`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        const data = await res.json();

        contentBody.innerHTML = `
            <div class="settings-page">
                <h2>My Profile</h2>

                <div class="account-card">
                    <p><b>First Name :</b> ${data.first_name}</p>
                    <p><b>Last Name :</b> ${data.last_name}</p>
                    <p><b>Email :</b> ${data.user.email_id}</p>
                    <p><b>Phone :</b> ${data.phone_no}</p>
                    <p><b>Gender :</b> ${data.gender}</p>
                    <p><b>DOB :</b> ${data.date_of_birth}</p>
                    <p><b>Address :</b> ${data.address}</p>
                    <p><b>About :</b> ${data.about}</p>
                </div>
            </div>
        `;

    }

    // ========= SIDEBAR =========
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

    loadCourse();

});

// ========= VIDEO / PDF TAB =========
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

// ========= OVERVIEW / REVIEW TAB =========
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