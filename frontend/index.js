document.addEventListener("DOMContentLoaded", () => {

    const API_BASE = "http://127.0.0.1:8000/api/v1";

    const courseGrid = document.getElementById("homeCourseGrid");
    const searchInput = document.querySelector(".search-box input");

    let allCourses = [];
    let searchText = "";

    // ================= LOAD COURSES =================
    async function loadCourses() {
        try {
            const res = await fetch(`${API_BASE}/courses/`, {
                headers: { Accept: "application/json" }
            });

            if (!res.ok) {
                courseGrid.innerHTML = "<p>No courses found.</p>";
                return;
            }

            const data = await res.json();

            allCourses = Array.isArray(data)
                ? data
                : (data.courses || []);

            renderCourses();

        } catch (err) {
            console.error(err);
            courseGrid.innerHTML = "<p>Failed to load courses.</p>";
        }
    }

    // ================= RENDER COURSES =================
    function renderCourses() {

        courseGrid.innerHTML = "";

        let courses = [...allCourses];

        // Search course first
        if (searchText !== "") {
            courses.sort((a, b) => {
                const aMatch = (a.course_name || "").toLowerCase().includes(searchText);
                const bMatch = (b.course_name || "").toLowerCase().includes(searchText);

                if (aMatch && !bMatch) return -1;
                if (!aMatch && bMatch) return 1;
                return 0;
            });
        }

        // Homepage only 8 courses
        courses.slice(0, 8).forEach(course => {

            const isMatch =
                searchText !== "" &&
                (course.course_name || "").toLowerCase().includes(searchText);

            const card = document.createElement("div");
            card.className = "course-card";
            if (isMatch) card.classList.add("search-highlight");

            card.innerHTML = `
                <img class="course-thumb"
                     src="image/myyy.png"
                     alt="Course Thumbnail">

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

            card.addEventListener("click", () => {
                localStorage.setItem("selected_course_id", course.id);
                window.location.href = `course_details.html?id=${course.id}`;
            });

            courseGrid.appendChild(card);
        });
    }

    // ================= SEARCH =================
   // ================= SEARCH =================
searchInput.addEventListener("input", () => {
    searchText = searchInput.value.trim().toLowerCase();

    // Course render
    renderCourses();

    // লেখা থাকলে Popular Courses এ auto scroll
    if (searchText !== "") {
        const section = document.querySelector(".popular-courses");

        if (section) {
            setTimeout(() => {
                section.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });
            }, 50);
        }
    }
}); 

    // ================= INIT =================
    loadCourses();

});