document.addEventListener("DOMContentLoaded", () => {

    const API_BASE = "http://127.0.0.1:8000/api/v1";

    const courseGrid = document.getElementById("homeCourseGrid");
    const searchInput = document.querySelector(".search-box input");

    let allCourses = [];

    // ================= LOAD COURSES =================

    async function loadCourses() {

        try {

            const res = await fetch(`${API_BASE}/courses/`, {
                headers: {
                    Accept: "application/json"
                }
            });

            if (!res.ok) {
                courseGrid.innerHTML = "<p>No courses found.</p>";
                return;
            }

            const data = await res.json();

            allCourses = Array.isArray(data)
                ? data
                : (data.courses || []);

            // Homepage e sudhu 8 ta course
            renderCourses(allCourses.slice(0, 8));

        } catch (err) {

            console.error(err);
            courseGrid.innerHTML = "<p>Failed to load courses.</p>";

        }

    }

    // ================= RENDER =================

    function renderCourses(courses) {

        courseGrid.innerHTML = "";

        courses.forEach(course => {

            const card = document.createElement("div");
            card.className = "course-card";
            card.style.cursor = "pointer";

            card.innerHTML = `
                <img class="course-thumb"
                     src="image/myyy.png"
                     alt="Thumbnail">

                <div class="course-body">

                    <h3>${course.course_name}</h3>

                    <p>${course.course_details}</p>

                    <div class="course-meta">
                        <span>${course.course_language}</span>

                        <strong>
                            ${course.course_paid
                                ? "₹" + course.course_price
                                : "Free"}
                        </strong>
                    </div>

                </div>
            `;

            // Course Details Page
            card.addEventListener("click", () => {
                localStorage.setItem("selected_course_id", course.id);
                window.location.href = `course_details.html?id=${course.id}`;
            });

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

        // Search eo maximum 8 ta
        renderCourses(filtered.slice(0, 8));

    });

    // ================= INIT =================

    loadCourses();

});