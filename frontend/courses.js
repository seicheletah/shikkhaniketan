(() => {

    const API_BASE = "http://127.0.0.1:8000/api/v1";

    // Enrolled কোর্স আসে student এর নিজের প্রোফাইল থেকে
    const STUDENT_ME_ENDPOINT = `${API_BASE}/students/me`;

    const searchInput = document.getElementById("courseSearch");
    const sortSelect = document.getElementById("sort");
    const courseGrid = document.getElementById("courseGrid");

    const enrolledSection = document.getElementById("enrolledSection");
    const enrolledGrid = document.getElementById("enrolledGrid");

    const videoTab = document.getElementById("videoTab");
    const documentTab = document.getElementById("documentTab");

    let allCourses = [];
    let enrolledCourses = [];
    let currentType = "video";

    let coursesFailed = false;
    let enrolledFailed = false;

    // শুধু লগইন করা student enrolled সেকশন দেখবে
    const hasStudentAccount =
        !!localStorage.getItem("access_token") &&
        localStorage.getItem("userRole") === "student";


    // ==========================================
    // SHOW LOADING SPINNER
    // ==========================================
    function showLoader(grid) {
        grid.innerHTML = `
            <div class="loader-wrap">
                <div class="spinner"></div>
                <p>Loading courses...</p>
            </div>
        `;
    }


    // ==========================================
    // HELPERS
    // ==========================================
    function isPaid(course) {
        return (
            course.course_paid === true ||
            course.course_paid === 1 ||
            course.course_paid === "1" ||
            course.course_paid === "true"
        );
    }

    function getCourseId(course) {
        return course.id !== undefined ? course.id : course.course_id;
    }

    function getAuthHeaders() {
        const token = localStorage.getItem("access_token");
        const headers = { Accept: "application/json" };
        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }
        return headers;
    }


    // ==========================================
    // GET COURSE THUMBNAIL
    // ==========================================
    async function getThumbnailUrl(courseId) {
        try {
            const res = await fetch(
                `${API_BASE}/courses/${courseId}/media/thumbnail/access`,
                { method: "GET", headers: getAuthHeaders() }
            );

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


    // ==========================================
    // LOAD ALL COURSES (Recommended)
    // ==========================================
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

            allCourses = Array.isArray(data) ? data : (data.courses || []);

        } catch (error) {
            console.log("Course loading error:", error);
            coursesFailed = true;
        }
    }


    // ==========================================
    // ENROLLED: /students/me রেসপন্স থেকে লিস্ট বের করা
    // ==========================================
    function findEnrolledList(data) {
        if (Array.isArray(data)) return data;
        if (!data || typeof data !== "object") return [];

        // ব্যাকএন্ডে ফিল্ডের নাম "course" (array)
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

        // নাম না মিললে প্রথম যে array পাওয়া যায় সেটা নেবে
        for (const value of Object.values(data)) {
            if (Array.isArray(value)) return value;
        }

        return [];
    }

    // প্রতিটা আইটেম থেকে পুরো কোর্স অবজেক্ট বানানো
    // (পুরো অবজেক্ট / { course: {...} } / শুধু id, তিনটাই চলবে)
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

        // আগে আনা সব কোর্সের মধ্যে খোঁজো
        const found = allCourses.find(c => String(getCourseId(c)) === String(id));
        if (found) return found;

        // না পেলে সরাসরি কোর্সটা আনো
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


    // ==========================================
    // LOAD ENROLLED COURSES
    // ==========================================
    async function loadEnrolledCourses() {

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

            // ডিবাগের জন্য: course এর ভেতরে কী আসছে কনসোলে দেখা যাবে
            console.log("students/me response:", data);

            const list = findEnrolledList(data);

            const resolved = await Promise.all(list.map(resolveCourse));

            enrolledCourses = resolved.filter(Boolean);

        } catch (error) {
            console.log("Enrolled course loading error:", error);
            enrolledCourses = [];
            enrolledFailed = true;
        }
    }


    // ==========================================
    // APPLY FILTERS
    // ==========================================
    function matchesTypeAndSearch(course) {
        const type = (course.course_resource_type || "video").toLowerCase();
        const text = searchInput.value.toLowerCase().trim();

        return (
            type === currentType &&
            (course.course_name || "").toLowerCase().includes(text)
        );
    }

    function applyFilters() {

        // ---------- RECOMMENDED ----------
        if (coursesFailed) {
            courseGrid.innerHTML = "<p class='grid-message'>Failed to load courses.</p>";
        } else {
            const enrolledIds = new Set(enrolledCourses.map(c => String(getCourseId(c))));

            let courses = allCourses
                .filter(course => !enrolledIds.has(String(getCourseId(course))))
                .filter(matchesTypeAndSearch);

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


    // ==========================================
    // OPEN COURSE
    // ==========================================
    function openCourse(course, isEnrolled) {
        const id = getCourseId(course);

        localStorage.setItem("selected_course_id", id);

        // Enrolled কোর্স সরাসরি course view-তে, বাকিগুলো details-এ
        const page = isEnrolled ? "course_view.html" : "course_details.html";

        if (typeof window.loadDashboardPage === "function") {
            window.loadDashboardPage(page);
        } else if (isEnrolled) {
            window.location.href = `course_view.html?course=${id}`;
        } else {
            window.location.href = `course_details.html?id=${id}`;
        }
    }


    // ==========================================
    // RENDER COURSES
    // ==========================================
    async function renderCourses(courses, grid, isEnrolled, emptyMessage) {

        grid.innerHTML = "";

        if (!courses.length) {
            grid.innerHTML = `<p class='grid-message'>${emptyMessage}</p>`;
            return;
        }

        const cards = courses.map(course => {

            const card = document.createElement("div");
            card.className = "card";

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

        // LOAD THUMBNAILS
        await Promise.all(
            cards.map(async ({ course, card }) => {

                const thumbnail = card.querySelector(".course-thumb");

                const thumbnailUrl = await getThumbnailUrl(getCourseId(course));

                thumbnail.src = thumbnailUrl;

                thumbnail.onerror = () => {
                    thumbnail.onerror = null;
                    thumbnail.src = "image/myyy.png";
                };
            })
        );
    }


    // ==========================================
    // EVENTS
    // ==========================================
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


    // ==========================================
    // INITIAL LOAD
    // ==========================================
    async function init() {
        showLoader(courseGrid);
        if (hasStudentAccount) {
            showLoader(enrolledGrid);
        }

        // আগে সব কোর্স, তারপর enrolled (id থেকে কোর্স খুঁজতে সব কোর্স লাগতে পারে)
        await loadCourses();
        await loadEnrolledCourses();

        applyFilters();
    }

    init();

})();