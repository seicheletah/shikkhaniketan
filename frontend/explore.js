document.addEventListener("DOMContentLoaded", () => {

    const API_BASE = "http://127.0.0.1:8000/api/v1";

    const searchInput = document.querySelector(".search-box input");
    const sortSelect = document.getElementById("sort");
    const courseGrid = document.getElementById("courseGrid");

    let allCourses = [];
    let filteredCourses = [];

    async function loadCourses() {
        try {
            const res = await fetch(`${API_BASE}/courses/`, {
                method: "GET",
                headers: {
                    "Accept": "application/json"
                }
            });

            if (!res.ok) {
                courseGrid.innerHTML = "<p>No courses available.</p>";
                return;
            }

            const data = await res.json();
            allCourses = Array.isArray(data) ? data : (data.courses || []);
            filteredCourses = [...allCourses];
            renderCourses(filteredCourses);

        } catch (err) {
            console.error(err);
            courseGrid.innerHTML = "<p>Failed to load courses.</p>";
        }
    }

    function renderCourses(courses) {

        courseGrid.innerHTML = "";

        if (courses.length === 0) {
            courseGrid.innerHTML = "<p>No courses found.</p>";
            return;
        }

        courses.forEach(course => {

            const card = document.createElement("div");
            card.className = "card";

            const thumbnail = course.thumbnail_url
                ? course.thumbnail_url
                : "/frontend/images/test_thumbnail.jpg";

            card.innerHTML = `
                <img class="course-thumb" src="${thumbnail}" alt="Thumbnail">

                <div class="course-body">
                    <h3>${course.course_name}</h3>
                    <p>${course.course_details}</p>

                    <div class="course-meta">
                        <span>${course.course_language}</span>
                        <strong>${course.course_paid ? "₹" + course.course_price : "Free"}</strong>
                    </div>
                </div>
            `;

            // LOGIN CHECK
            card.onclick = () => {
                const token = localStorage.getItem("access_token");

                if (token) {
                    window.location.href = `course_details.html?id=${course.id}`;
                } else {
                    window.location.href = "sign_up.html";
                }
            };

            courseGrid.appendChild(card);
        });
    }

    searchInput.addEventListener("input", () => {
        const value = searchInput.value.toLowerCase();

        filteredCourses = allCourses.filter(course =>
            (course.course_name || "").toLowerCase().includes(value)
        );

        renderCourses(filteredCourses);
    });

    sortSelect.addEventListener("change", () => {

        if (sortSelect.value === "newest") {
            filteredCourses.sort((a, b) =>
                new Date(b.created_at || 0) - new Date(a.created_at || 0)
            );
        } else {
            filteredCourses.sort((a, b) =>
                (a.course_name || "").localeCompare(b.course_name || "")
            );
        }

        renderCourses(filteredCourses);
    });

    loadCourses();
});