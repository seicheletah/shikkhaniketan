(() => {

    const API_BASE = "http://127.0.0.1:8000/api/v1";

    const searchInput = document.getElementById("courseSearch");
    const sortSelect = document.getElementById("sort");
    const courseGrid = document.getElementById("courseGrid");

    const videoTab = document.getElementById("videoTab");
    const documentTab = document.getElementById("documentTab");

    let allCourses = [];
    let currentType = "video";


    // ==========================================
    // SHOW LOADING SPINNER
    // ==========================================
    function showLoader() {
        courseGrid.innerHTML = `
            <div class="loader-wrap">
                <div class="spinner"></div>
                <p>Loading courses...</p>
            </div>
        `;
    }


    // ==========================================
    // CHECK PAID COURSE
    // ==========================================
    function isPaid(course) {
        return (
            course.course_paid === true ||
            course.course_paid === 1 ||
            course.course_paid === "1" ||
            course.course_paid === "true"
        );
    }


    // ==========================================
    // GET COURSE THUMBNAIL
    // ==========================================
    async function getThumbnailUrl(courseId) {
        try {
            const token = localStorage.getItem("access_token");

            const headers = { Accept: "application/json" };
            if (token) {
                headers.Authorization = `Bearer ${token}`;
            }

            const res = await fetch(
                `${API_BASE}/courses/${courseId}/media/thumbnail/access`,
                { method: "GET", headers }
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
    // LOAD COURSES
    // ==========================================
    async function loadCourses() {

        // ফেচ শুরুর আগেই স্পিনার দেখাও
        showLoader();

        try {
            const token = localStorage.getItem("access_token");

            const headers = { Accept: "application/json" };
            if (token) {
                headers.Authorization = `Bearer ${token}`;
            }

            const res = await fetch(`${API_BASE}/courses/`, {
                method: "GET",
                headers
            });

            if (!res.ok) {
                throw new Error(`Failed to load courses: ${res.status}`);
            }

            const data = await res.json();

            allCourses = Array.isArray(data) ? data : (data.courses || []);

            // applyFilters -> renderCourses স্পিনার মুছে কোর্স বসাবে
            applyFilters();

        } catch (error) {
            console.log("Course loading error:", error);
            courseGrid.innerHTML = "<p class='grid-message'>Failed to load courses.</p>";
        }
    }


    // ==========================================
    // APPLY FILTERS
    // ==========================================
    function applyFilters() {

        let courses = [...allCourses];

        // VIDEO / DOCUMENT
        courses = courses.filter(course =>
            (course.course_resource_type || "video").toLowerCase() === currentType
        );

        // SEARCH
        const text = searchInput.value.toLowerCase().trim();

        courses = courses.filter(course =>
            (course.course_name || "").toLowerCase().includes(text)
        );

        // SORT / PAID / FREE
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

        renderCourses(courses);
    }


    // ==========================================
    // OPEN COURSE DETAILS
    // ==========================================
    function openCourse(course) {
        localStorage.setItem("selected_course_id", course.id);

        // ড্যাশবোর্ডের ভেতরে খুলবে (সাইডবার আর টপবার থাকবে)
        if (typeof window.loadDashboardPage === "function") {
            window.loadDashboardPage("course_details.html");
        } else {
            window.location.href = `course_details.html?id=${course.id}`;
        }
    }


    // ==========================================
    // RENDER COURSES
    // ==========================================
    async function renderCourses(courses) {

        // এখানে innerHTML খালি করায় স্পিনার সরে যায়
        courseGrid.innerHTML = "";

        if (!courses.length) {
            courseGrid.innerHTML = "<p class='grid-message'>No courses found.</p>";
            return;
        }

        const cards = courses.map(course => {

            const card = document.createElement("div");
            card.className = "card";

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

                        <strong>
                            ${isPaid(course) ? "₹" + (course.course_price || 0) : "Free"}
                        </strong>

                    </div>

                </div>
            `;

            card.addEventListener("click", () => openCourse(course));

            courseGrid.appendChild(card);

            return { course, card };
        });

        // LOAD THUMBNAILS
        await Promise.all(
            cards.map(async ({ course, card }) => {

                const thumbnail = card.querySelector(".course-thumb");

                const thumbnailUrl = await getThumbnailUrl(course.id);

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
    loadCourses();

})();