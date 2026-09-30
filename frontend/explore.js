document.addEventListener("DOMContentLoaded", () => {

    const API_BASE = "http://127.0.0.1:8000/api/v1";

    const searchInput = document.querySelector(".search-box input");
    const sortSelect = document.getElementById("sort");
    const courseGrid = document.getElementById("courseGrid");

    const videoTab = document.getElementById("videoTab");
    const documentTab = document.getElementById("documentTab");

    let allCourses = [];
    let currentType = "video";

    // LOAD
    async function loadCourses() {
        try {
            const res = await fetch(`${API_BASE}/courses/`, {
                headers: { Accept: "application/json" }
            });

            const data = await res.json();

            allCourses = Array.isArray(data)
                ? data
                : (data.courses || []);

            applyFilters();

        } catch (err) {
            console.log(err);
            courseGrid.innerHTML = "<p>Failed to load courses.</p>";
        }
    }

    // FILTER
    function applyFilters() {

        let courses = [...allCourses];

        // Video / Document
        courses = courses.filter(c =>
            (c.course_resource_type || "video") === currentType
        );

        // Search
        const text = searchInput.value.toLowerCase().trim();

        courses = courses.filter(c =>
            (c.course_name || "").toLowerCase().includes(text)
        );

        // Sort
        switch (sortSelect.value) {

            case "paid":
                courses = courses.filter(c => c.course_paid === true);
                break;

            case "free":
                courses = courses.filter(c => c.course_paid === false);
                break;

            case "newest":
                courses.sort((a, b) =>
                    new Date(b.created_at || 0) -
                    new Date(a.created_at || 0)
                );
                break;

            default:
                break;
        }

        renderCourses(courses);
    }

    // RENDER
    function renderCourses(courses) {

        courseGrid.innerHTML = "";

        if (!courses.length) {
            courseGrid.innerHTML = "<p>No courses found.</p>";
            return;
        }

        courses.forEach(course => {

            const card = document.createElement("div");
            card.className = "card";

            card.innerHTML = `
                <img class="course-thumb"
                     src="image/myyy.png"
                     alt="Course">

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

    // EVENTS
    searchInput.addEventListener("input", applyFilters);
    sortSelect.addEventListener("change", applyFilters);

    videoTab.addEventListener("click", () => {
        currentType = "video";
        videoTab.classList.add("active");
        documentTab.classList.remove("active");
        applyFilters();
    });

    documentTab.addEventListener("click", () => {
        currentType = "document";
        documentTab.classList.add("active");
        videoTab.classList.remove("active");
        applyFilters();
    });

    loadCourses();
});