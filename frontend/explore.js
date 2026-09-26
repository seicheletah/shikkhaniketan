document.addEventListener("DOMContentLoaded", () => {

    const API_BASE = "http://127.0.0.1:8000/api/v1";

    const searchInput = document.querySelector(".search-box input");
    const sortSelect = document.getElementById("sort");
    const courseGrid = document.getElementById("courseGrid");

    const videoTab = document.getElementById("videoTab");
    const documentTab = document.getElementById("documentTab");

    let allCourses = [];
    let currentType = "video";

    // ================= LOAD COURSES =================
    async function loadCourses() {
        try {
            const res = await fetch(`${API_BASE}/courses/`, {
                headers: {
                    Accept: "application/json"
                }
            });

            if (!res.ok) {
                courseGrid.innerHTML = "<p>No courses available.</p>";
                return;
            }

            const data = await res.json();

            allCourses = Array.isArray(data)
                ? data
                : (data.courses || []);

            applyFilters();

        } catch (err) {
            console.error(err);
            courseGrid.innerHTML = "<p>Failed to load courses.</p>";
        }
    }

    // ================= FILTER =================
    function applyFilters() {

        let courses = [...allCourses];

        // Video / Document Filter
        courses = courses.filter(course =>
            (course.course_resource_type || "video") === currentType
        );

        // Search
        const text = searchInput.value.toLowerCase();

        courses = courses.filter(course =>
            (course.course_name || "")
                .toLowerCase()
                .includes(text)
        );

        // Sort
        if (sortSelect.value === "newest") {
            courses.sort((a, b) =>
                new Date(b.created_at || 0) -
                new Date(a.created_at || 0)
            );
        } else {
            courses.sort((a, b) =>
                (a.course_name || "")
                    .localeCompare(b.course_name || "")
            );
        }

        renderCourses(courses);
    }

    // ================= RENDER =================
    function renderCourses(courses) {

        courseGrid.innerHTML = "";

        if (courses.length === 0) {
            courseGrid.innerHTML = "<p>No courses found.</p>";
            return;
        }

        courses.forEach(course => {

            const card = document.createElement("div");
            card.className = "card";
            card.style.cursor = "pointer";

            // Same thumbnail for every course
            const thumbnail = "image/myyy.png";

            card.innerHTML = `
                <img class="course-thumb"
                     src="${thumbnail}"
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

            // CLICK → COURSE DETAILS
            card.addEventListener("click", () => {
                localStorage.setItem("selected_course_id", course.id);
                window.location.href = `course_details.html?id=${course.id}`;
            });

            courseGrid.appendChild(card);
        });
    }

    // ================= SEARCH =================
    if (searchInput) {
        searchInput.addEventListener("input", applyFilters);
    }

    // ================= SORT =================
    if (sortSelect) {
        sortSelect.addEventListener("change", applyFilters);
    }

    // ================= VIDEO TAB =================
    if (videoTab) {
        videoTab.addEventListener("click", () => {
            currentType = "video";
            videoTab.classList.add("active");
            documentTab?.classList.remove("active");
            applyFilters();
        });
    }

    // ================= DOCUMENT TAB =================
    if (documentTab) {
        documentTab.addEventListener("click", () => {
            currentType = "document";
            documentTab.classList.add("active");
            videoTab?.classList.remove("active");
            applyFilters();
        });
    }

    // ================= INIT =================
    loadCourses();

});