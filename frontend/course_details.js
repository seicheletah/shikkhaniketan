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

    // ---------- LOGOUT ----------
    document.querySelector(".logout")?.addEventListener("click", e => {

        e.preventDefault();

        localStorage.clear();

        window.location.href = "login.html";

    });

    // ---------- INIT ----------
    loadStudent();
    loadCourse();

});