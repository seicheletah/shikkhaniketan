document.addEventListener("DOMContentLoaded", () => {

    const API_URL = "http://127.0.0.1:8000/api/v1/courses/";

    // Login token
    const token = localStorage.getItem("access_token");

    if (!token) {
        alert("Please login first.");
        window.location.href = "login.html";
        return;
    }

    const searchInput = document.querySelector(".search-box input");
    const sortSelect = document.getElementById("sort");
    const cards = document.querySelectorAll(".cards-grid .card");

    let allCourses = [];
    let filteredCourses = [];

    // =========================
    // LOAD COURSES
    // =========================
    async function loadCourses() {

        try {

            console.log("Token:", token);

            const response = await fetch(API_URL, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Accept": "application/json"
                }
            });

            console.log("Status:", response.status);

            if (response.status === 401) {
                alert("Session expired. Please login again.");
                localStorage.removeItem("access_token");
                window.location.href = "login.html";
                return;
            }

            const data = await response.json();

            console.log("Courses:", data);

            allCourses = Array.isArray(data)
                ? data
                : (data.courses || []);

            filteredCourses = [...allCourses];

            renderCourses(filteredCourses);

        } catch (err) {
            console.error(err);
        }
    }

    // =========================
    // RENDER COURSES
    // =========================
    function renderCourses(courses) {

        cards.forEach((card, index) => {

            if (index >= courses.length) {
                card.style.display = "none";
                return;
            }

            const c = courses[index];

            card.style.display = "block";

            card.innerHTML = `
                <h3>${c.course_name}</h3>
                <p>${c.course_details}</p>
                <small>${c.course_language}</small><br>
                <strong>${c.course_paid ? "₹" + c.course_price : "Free"}</strong>
            `;

            card.onclick = () => {
                window.location.href = `course_details.html?id=${c.id}`;
            };
        });
    }

    // =========================
    // SEARCH
    // =========================
    if (searchInput) {
        searchInput.addEventListener("input", () => {

            const value = searchInput.value.toLowerCase();

            filteredCourses = allCourses.filter(course =>
                (course.course_name || "").toLowerCase().includes(value)
            );

            renderCourses(filteredCourses);
        });
    }

    // =========================
    // SORT
    // =========================
    if (sortSelect) {
        sortSelect.addEventListener("change", () => {

            if (sortSelect.value === "newest") {
                filteredCourses.sort((a, b) =>
                    new Date(b.created_at) - new Date(a.created_at)
                );
            } else {
                filteredCourses.sort((a, b) =>
                    (a.course_name || "").localeCompare(b.course_name || "")
                );
            }

            renderCourses(filteredCourses);
        });
    }

    // Initial Load
    loadCourses();

});