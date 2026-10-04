/* ==========================================================
   courses.js
   Shows the "Recommended" and "Enrolled" course lists inside
   the student dashboard.

   Everything is wrapped in an IIFE (Immediately Invoked Function
   Expression) so our variables never leak into the global scope
   and never clash with other page scripts.
   ========================================================== */
(() => {

    /* ------------------------------------------------------
       CONFIGURATION
       ------------------------------------------------------ */
    const API_BASE = "http://127.0.0.1:8000/api/v1";

    // The enrolled courses come from the logged-in student's own profile
    const STUDENT_ME_ENDPOINT = `${API_BASE}/students/me`;

    // How long (ms) the spinner stays visible when the user switches
    // between the Videos / Documents tabs. It gives a smooth,
    // consistent "loading" feel on every tab.
    const TAB_SWITCH_DELAY = 500;

    /* ------------------------------------------------------
       DOM ELEMENTS
       ------------------------------------------------------ */
    const searchInput = document.getElementById("courseSearch");
    const sortSelect = document.getElementById("sort");
    const courseGrid = document.getElementById("courseGrid");

    const enrolledSection = document.getElementById("enrolledSection");
    const enrolledGrid = document.getElementById("enrolledGrid");

    const videoTab = document.getElementById("videoTab");
    const documentTab = document.getElementById("documentTab");

    /* ------------------------------------------------------
       STATE
       ------------------------------------------------------ */
    let allCourses = [];        // every course returned by the API
    let enrolledCourses = [];   // courses the student has purchased
    let currentType = "video";  // which tab is selected: "video" | "document"

    let coursesFailed = false;  // true if the courses API call failed
    let enrolledFailed = false; // true if the student profile API call failed

    // Used to ignore outdated tab clicks if the user clicks very fast
    let tabRequestId = 0;

    // Only a logged-in student can see the "Enrolled Courses" section
    const hasStudentAccount =
        !!localStorage.getItem("access_token") &&
        localStorage.getItem("userRole") === "student";


    /* ==========================================
       LOADING SPINNER
       Replaces the grid content with a spinning circle.
       ========================================== */
    function showLoader(grid) {
        grid.innerHTML = `
            <div class="loader-wrap">
                <div class="spinner"></div>
                <p>Loading courses...</p>
            </div>
        `;
    }

    /** Small helper: wait for `ms` milliseconds (used with await). */
    function wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }


    /* ==========================================
       HELPERS
       ========================================== */

    /** The backend may send the paid flag as true / 1 / "1" / "true". */
    function isPaid(course) {
        return (
            course.course_paid === true ||
            course.course_paid === 1 ||
            course.course_paid === "1" ||
            course.course_paid === "true"
        );
    }

    /** Course id can be named "id" or "course_id" depending on the API. */
    function getCourseId(course) {
        return course.id !== undefined ? course.id : course.course_id;
    }

    /**
     * Normalises the resource type of a course to either
     * "video" or "document".
     * The backend might send "document", "pdf", "doc", "documents"...
     * so anything that looks like a document becomes "document".
     */
    function getCourseType(course) {
        const raw = String(course.course_resource_type || "video").toLowerCase();

        if (raw.includes("doc") || raw.includes("pdf")) {
            return "document";
        }
        return "video";
    }

    /** Builds request headers, adding the Bearer token when logged in. */
    function getAuthHeaders() {
        const token = localStorage.getItem("access_token");
        const headers = { Accept: "application/json" };
        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }
        return headers;
    }


    /* ==========================================
       COURSE THUMBNAIL
       ========================================== */
    async function getThumbnailUrl(courseId) {
        try {
            const res = await fetch(
                `${API_BASE}/courses/${courseId}/media/thumbnail/access`,
                { method: "GET", headers: getAuthHeaders() }
            );

            // No thumbnail available -> use the default image
            if (!res.ok) {
                return "image/myyy.png";
            }

            const data = await res.json();

            if (data && data.stream_url) {
                return data.stream_url;
            }

            return "image/myyy.png";

        } catch (error) {
            console.log(`Thumbnail loading error for course ${courseId}:`, error);
            return "image/myyy.png";
        }
    }


    /* ==========================================
       LOAD ALL COURSES (used for "Recommended")
       ========================================== */
    async function loadCourses() {
        try {
            const res = await fetch(`${API_BASE}/courses/`, {
                method: "GET",
                headers: getAuthHeaders()
            });

            if (!res.ok) {
                throw new Error(`Failed to load courses: ${res.status}`);
            }

            const data = await res.json();

            // The API may return a plain array or { courses: [...] }
            allCourses = Array.isArray(data) ? data : (data.courses || []);

        } catch (error) {
            console.log("Course loading error:", error);
            coursesFailed = true;
        }
    }


    /* ==========================================
       ENROLLED COURSES
       ========================================== */

    /** Finds the list of enrolled courses inside the /students/me response. */
    function findEnrolledList(data) {
        if (Array.isArray(data)) return data;
        if (!data || typeof data !== "object") return [];

        // Possible field names the backend might use
        const keys = [
            "course",
            "courses",
            "enrolled_courses",
            "enrolled",
            "purchased_courses",
            "purchases",
            "enrollments",
            "my_courses"
        ];

        for (const key of keys) {
            if (Array.isArray(data[key])) return data[key];
        }

        // Fallback: use the first array found in the response
        for (const value of Object.values(data)) {
            if (Array.isArray(value)) return value;
        }

        return [];
    }

    /**
     * Turns one enrolled item into a full course object.
     * Works with: a full course object, { course: {...} }, or just an id.
     */
    async function resolveCourse(item) {
        if (!item) return null;

        if (item.course && typeof item.course === "object") {
            return item.course;
        }

        if (typeof item === "object" && item.course_name !== undefined) {
            return item;
        }

        const id = typeof item === "object"
            ? (item.course_id !== undefined ? item.course_id : item.id)
            : item;

        if (!id) return null;

        // First look inside the courses we already downloaded
        const found = allCourses.find(c => String(getCourseId(c)) === String(id));
        if (found) return found;

        // Otherwise fetch that single course directly
        try {
            const res = await fetch(`${API_BASE}/courses/${id}`, {
                headers: getAuthHeaders()
            });
            if (res.ok) return await res.json();
        } catch (e) {
            console.log("Enrolled course fetch error:", e);
        }

        return null;
    }

    async function loadEnrolledCourses() {

        // Visitors / non-students never see the Enrolled section
        if (!hasStudentAccount) {
            enrolledSection.classList.add("hidden");
            return;
        }

        enrolledSection.classList.remove("hidden");

        try {
            const res = await fetch(STUDENT_ME_ENDPOINT, {
                method: "GET",
                headers: getAuthHeaders()
            });

            if (!res.ok) {
                throw new Error(`Failed to load student profile: ${res.status}`);
            }

            const data = await res.json();

            const list = findEnrolledList(data);
            const resolved = await Promise.all(list.map(resolveCourse));

            enrolledCourses = resolved.filter(Boolean);

        } catch (error) {
            console.log("Enrolled course loading error:", error);
            enrolledCourses = [];
            enrolledFailed = true;
        }
    }


    /* ==========================================
       FILTERS (tab type + search text + sort)
       ========================================== */

    /** True when the course matches the selected tab AND the search text. */
    function matchesTypeAndSearch(course) {
        const text = searchInput.value.toLowerCase().trim();

        return (
            getCourseType(course) === currentType &&
            (course.course_name || "").toLowerCase().includes(text)
        );
    }

    function applyFilters() {

        // ---------- RECOMMENDED ----------
        if (coursesFailed) {
            courseGrid.innerHTML = "<p class='grid-message'>Failed to load courses.</p>";
        } else {
            // Hide courses that the student already owns
            const enrolledIds = new Set(enrolledCourses.map(c => String(getCourseId(c))));

            let courses = allCourses
                .filter(course => !enrolledIds.has(String(getCourseId(course))))
                .filter(matchesTypeAndSearch);

            // Apply the "Sort" dropdown
            switch (sortSelect.value) {

                case "paid":
                    courses = courses.filter(course => isPaid(course));
                    break;

                case "free":
                    courses = courses.filter(course => !isPaid(course));
                    break;

                case "newest":
                    courses.sort((a, b) => {
                        const dateA = new Date(a.created_at || 0);
                        const dateB = new Date(b.created_at || 0);
                        return dateB - dateA;
                    });
                    break;

                default:
                    break;
            }

            renderCourses(courses, courseGrid, false, "No courses found.");
        }

        // ---------- ENROLLED ----------
        if (hasStudentAccount) {
            if (enrolledFailed) {
                enrolledGrid.innerHTML = "<p class='grid-message'>Failed to load enrolled courses.</p>";
            } else {
                const enrolled = enrolledCourses.filter(matchesTypeAndSearch);

                renderCourses(
                    enrolled,
                    enrolledGrid,
                    true,
                    "You haven't enrolled in any course yet."
                );
            }
        }
    }


    /* ==========================================
       OPEN A COURSE
       Enrolled -> course_view.html, otherwise course_details.html
       ========================================== */
    function openCourse(course, isEnrolled) {
        const id = getCourseId(course);

        // The next page reads the id from localStorage
        localStorage.setItem("selected_course_id", id);

        const page = isEnrolled ? "course_view.html" : "course_details.html";

        // Inside the dashboard: load the page without leaving it
        if (typeof window.loadDashboardPage === "function") {
            window.loadDashboardPage(page);
        } else if (isEnrolled) {
            window.location.href = `course_view.html?course=${id}`;
        } else {
            window.location.href = `course_details.html?id=${id}`;
        }
    }


    /* ==========================================
       RENDER COURSE CARDS
       ========================================== */
    async function renderCourses(courses, grid, isEnrolled, emptyMessage) {

        grid.innerHTML = "";

        if (!courses.length) {
            grid.innerHTML = `<p class='grid-message'>${emptyMessage}</p>`;
            return;
        }

        const cards = courses.map(course => {

            const card = document.createElement("div");
            card.className = "card";

            // Right side of the card: "Enrolled" badge or the price
            const rightSide = isEnrolled
                ? `<span class="enrolled-badge">Enrolled</span>`
                : `<strong>${isPaid(course) ? "₹" + (course.course_price || 0) : "Free"}</strong>`;

            card.innerHTML = `
                <img
                    class="course-thumb"
                    src="image/myyy.png"
                    alt="${course.course_name || "Course"}"
                >

                <div class="course-body">
                    <h3>${course.course_name || ""}</h3>
                    <p>${course.course_details || ""}</p>

                    <div class="course-meta">
                        <span>${course.course_language || ""}</span>
                        ${rightSide}
                    </div>
                </div>
            `;

            card.addEventListener("click", () => openCourse(course, isEnrolled));

            grid.appendChild(card);

            return { course, card };
        });

        // Load the real thumbnails in parallel (placeholder is shown first)
        await Promise.all(
            cards.map(async ({ course, card }) => {

                const thumbnail = card.querySelector(".course-thumb");
                const thumbnailUrl = await getThumbnailUrl(getCourseId(course));

                thumbnail.src = thumbnailUrl;

                // If the image fails to load, fall back to the default image
                thumbnail.onerror = () => {
                    thumbnail.onerror = null;
                    thumbnail.src = "image/myyy.png";
                };
            })
        );
    }


    /* ==========================================
       TAB SWITCHING (Videos <-> Documents)
       Shows the spinner first, then the filtered cards.
       ========================================== */
    async function switchTab(type) {
        currentType = type;

        // Highlight the clicked tab
        videoTab.classList.toggle("active", type === "video");
        documentTab.classList.toggle("active", type === "document");

        // Remember which click this is, so an older click can't overwrite a newer one
        const myRequest = ++tabRequestId;

        // Show the spinner right away
        showLoader(courseGrid);
        if (hasStudentAccount) {
            showLoader(enrolledGrid);
        }

        await wait(TAB_SWITCH_DELAY);

        // The user clicked another tab meanwhile -> stop here
        if (myRequest !== tabRequestId) return;

        applyFilters();
    }


    /* ==========================================
       EVENTS
       ========================================== */
    searchInput.addEventListener("input", applyFilters);
    sortSelect.addEventListener("change", applyFilters);

    videoTab.addEventListener("click", () => switchTab("video"));
    documentTab.addEventListener("click", () => switchTab("document"));


    /* ==========================================
       INITIAL LOAD
       ========================================== */
    async function init() {
        // Spinner while the API data is loading
        showLoader(courseGrid);
        if (hasStudentAccount) {
            showLoader(enrolledGrid);
        }

        // All courses first, then enrolled (enrolled lookup may need all courses)
        await loadCourses();
        await loadEnrolledCourses();

        applyFilters();
    }

    init();

})();