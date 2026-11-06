/* ==========================================================
   courses.js
   Shows the "Recommended" and "Enrolled" course lists inside
   the student dashboard.

   WHAT IS NEW IN THIS VERSION
   - Every course card now shows the SAME full details as the
     Explore page: name, description, teacher (photo + name),
     rating (number + stars + count), enrolled count, comments
     count, tags, language and price.
   - Enrolled courses are completed with the full course data
     (teacher, rating, tags...) if /students/me did not send them.
   - The tag list + tagLabel helper now live inside this file.

   EVERYTHING ELSE IS UNCHANGED:
   - course list and student profile are requested at the same time
   - card structure first, thumbnails later (lazy + queue + cache)
   - tabs, search, sort, spinner, enrolled section, click behaviour

   Everything is wrapped in an IIFE so our variables never leak into
   the global scope and never clash with other page scripts.
   ========================================================== */
(() => {

    /* ------------------------------------------------------
       CONFIGURATION
       ------------------------------------------------------ */
    const API_BASE = "http://127.0.0.1:8000/api/v1";

    // The enrolled courses come from the logged-in student's own profile
    const STUDENT_ME_ENDPOINT = `${API_BASE}/students/me`;

    // How long (ms) the spinner stays visible when switching tabs
    const TAB_SWITCH_DELAY = 200;

    // Picture shown until the real thumbnail arrives (or if it fails)
    const DEFAULT_THUMB = "image/myyy.png";

    // How many thumbnail requests may run at the same moment
    const THUMB_CONCURRENCY = 3;

    /* ------------------------------------------------------
       TAGS  (list is not needed here, only the label helper)
       Turns "web_development" into "Web Development",
       "mba" into "MBA", "c_plus_plus" into "C++" ...
       ------------------------------------------------------ */

    // Shown in UPPER CASE (degree names / acronyms)
    const UPPER_TAGS = new Set([
        "ba","bsc","bcom","btech","be","bca","bba","barch","bfa","bed","mbbs","bds","bams","bhms",
        "bpharma","llb","ma","msc","mcom","mtech","me","mca","mba","md","llm","med","phd","sql","php"
    ]);

    // Labels that the simple rule can not produce
    const SPECIAL_TAG_LABELS = {
        c_plus_plus: "C++",
        c_sharp: "C#",
        go_lang: "Go",
        ba_llb: "BA LLB",
        bba_llb: "BBA LLB",
        bsc_nursing: "BSc Nursing",
        ms_medical: "MS (Medical)",
        seo_sem: "SEO / SEM",
        polytechnic_diploma: "Polytechnic Diploma"
    };

    function tagLabel(tag) {
        tag = String(tag);
        if (SPECIAL_TAG_LABELS[tag]) return SPECIAL_TAG_LABELS[tag];
        if (UPPER_TAGS.has(tag)) return tag.toUpperCase();
        // "class_10" -> "Class 10", "web_development" -> "Web Development"
        return tag
            .split("_")
            .map(w => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" ");
    }

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

    /** Makes text safe before it is placed inside innerHTML. */
    function escapeHtml(value) {
        return String(value === undefined || value === null ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    /** Format numbers: 1250 -> "1,250" */
    function formatNumber(n) {
        return Number(n || 0).toLocaleString("en-IN");
    }

    /** 4.3 -> "★★★★☆" */
    function starsText(rating) {
        const full = Math.min(5, Math.max(0, Math.round(Number(rating) || 0)));
        return "★".repeat(full) + "☆".repeat(5 - full);
    }

    /** The backend may send the paid flag as true / 1 / "1" / "true". */
    function isPaid(course) {
        return (
            course.course_paid === true ||
            course.course_paid === 1 ||
            course.course_paid === "1" ||
            course.course_paid === "true"
        );
    }

    /** Price text: "Free" or "₹1,500" (other currencies show their code). */
    function priceText(course) {
        if (!isPaid(course)) return "Free";

        const currency = course.course_price_currency || "INR";
        const symbol = currency === "INR" ? "₹" : currency + " ";

        return symbol + formatNumber(course.course_price);
    }

    /** Course id can be named "id" or "course_id" depending on the API. */
    function getCourseId(course) {
        return course.id !== undefined ? course.id : course.course_id;
    }

    /**
     * Normalises the resource type of a course to "video" or "document".
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
       COURSE THUMBNAILS  (cache + queue + lazy loading)
       ========================================== */

    // courseId -> thumbnail url that we already know
    const thumbCache = new Map();

    // courseId -> a request that is running right now
    const thumbInflight = new Map();

    /** Asks the backend for the thumbnail link of ONE course (cached). */
    function getThumbnailUrl(courseId) {

        // 1) Already known -> answer immediately
        if (thumbCache.has(courseId)) {
            return Promise.resolve(thumbCache.get(courseId));
        }

        // 2) Already being requested -> reuse that request
        if (thumbInflight.has(courseId)) {
            return thumbInflight.get(courseId);
        }

        // 3) New request
        const request = (async () => {
            let url = DEFAULT_THUMB;

            try {
                const res = await fetch(
                    `${API_BASE}/courses/${courseId}/media/thumbnail/access`,
                    { method: "GET", headers: getAuthHeaders() }
                );

                if (res.ok) {
                    const data = await res.json();
                    if (data && data.stream_url) {
                        url = data.stream_url;
                    }
                }
            } catch (error) {
                console.log(`Thumbnail loading error for course ${courseId}:`, error);
            }

            thumbCache.set(courseId, url);   // remember the answer
            thumbInflight.delete(courseId);  // the request is finished
            return url;
        })();

        thumbInflight.set(courseId, request);
        return request;
    }

    /* ---- A tiny queue: only THUMB_CONCURRENCY jobs run at the same time ---- */
    const thumbQueue = [];     // jobs waiting for their turn
    let activeThumbJobs = 0;   // jobs running right now

    /** Starts waiting jobs while there is free room. */
    function pumpThumbQueue() {
        while (activeThumbJobs < THUMB_CONCURRENCY && thumbQueue.length) {
            const job = thumbQueue.shift();
            activeThumbJobs++;

            job().finally(() => {
                activeThumbJobs--;
                pumpThumbQueue(); // a place became free -> start the next one
            });
        }
    }

    /** Puts one thumbnail job at the end of the queue. */
    function enqueueThumbJob(job) {
        thumbQueue.push(job);
        pumpThumbQueue();
    }

    /** Puts the real thumbnail into an <img> (queued, so it is gentle). */
    function loadThumbnailInto(img, courseId) {
        enqueueThumbJob(async () => {
            const url = await getThumbnailUrl(courseId);

            // If the image fails to load, fall back to the default image
            img.onerror = () => {
                img.onerror = null;
                img.src = DEFAULT_THUMB;
            };
            img.src = url;
        });
    }

    /**
     * Watches the cards: the moment a card comes close to the visible
     * screen area, its thumbnail starts loading.
     */
    const thumbObserver = ("IntersectionObserver" in window)
        ? new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;

                const img = entry.target;
                thumbObserver.unobserve(img); // load only once per image
                loadThumbnailInto(img, img.dataset.courseId);
            });
        }, { rootMargin: "200px" })
        : null;

    /** Connects one card image to the lazy loader. */
    function attachThumbnail(img, courseId) {

        // Known from before -> show it right away, no waiting
        if (thumbCache.has(courseId)) {
            img.src = thumbCache.get(courseId);
            return;
        }

        img.dataset.courseId = courseId;

        if (thumbObserver) {
            thumbObserver.observe(img);           // modern browsers: lazy
        } else {
            loadThumbnailInto(img, courseId);     // very old browsers: load now
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

    /** Downloads the student's profile (/students/me). null on failure. */
    async function fetchStudentProfile() {
        try {
            const res = await fetch(STUDENT_ME_ENDPOINT, {
                method: "GET",
                headers: getAuthHeaders()
            });

            if (!res.ok) {
                throw new Error(`Failed to load student profile: ${res.status}`);
            }

            return await res.json();

        } catch (error) {
            console.log("Enrolled course loading error:", error);
            return null;
        }
    }

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

    /**
     * NEW: completes an enrolled course with the full data from the
     * course list (teacher, rating, enrolled, comments, tags...).
     * The profile data may only contain a few fields, so we merge:
     * the full course from /courses/ is laid over the short one.
     */
    function enrichCourse(course) {
        const full = allCourses.find(
            c => String(getCourseId(c)) === String(getCourseId(course))
        );
        return full ? { ...course, ...full } : course;
    }

    /** Fills `enrolledCourses` from the already-downloaded profile data. */
    async function loadEnrolledCourses(profileData) {

        // Visitors / non-students never see the Enrolled section
        if (!hasStudentAccount) {
            enrolledSection.classList.add("hidden");
            return;
        }

        enrolledSection.classList.remove("hidden");

        if (profileData === null) {
            enrolledCourses = [];
            enrolledFailed = true;
            return;
        }

        const list = findEnrolledList(profileData);
        const resolved = await Promise.all(list.map(resolveCourse));

        enrolledCourses = resolved.filter(Boolean).map(enrichCourse);
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

        // The old cards are about to be thrown away, so stop watching them
        if (thumbObserver) thumbObserver.disconnect();

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
       The card (all details) is drawn FIRST with the default picture.
       The real thumbnail is attached afterwards, lazily and gently.
       ========================================== */
    function renderCourses(courses, grid, isEnrolled, emptyMessage) {

        grid.innerHTML = "";

        if (!courses.length) {
            grid.innerHTML = `<p class='grid-message'>${escapeHtml(emptyMessage)}</p>`;
            return;
        }

        // Build all cards off-screen and add them in ONE step
        const fragment = document.createDocumentFragment();

        courses.forEach(course => {

            const card = document.createElement("div");
            card.className = "card";

            // ---- teacher ----
            const teacher = course.teacher || {};
            const teacherName =
                `${teacher.first_name || ""} ${teacher.last_name || ""}`.trim() || "Instructor";

            // ---- tags (max 3 + "+N") ----
            const allTags = course.course_tags || [];
            const shownTags = allTags.slice(0, 3);
            const extraTags = allTags.length - shownTags.length;

            // Right side of the footer: "Enrolled" badge or the price
            const rightSide = isEnrolled
                ? `<span class="enrolled-badge">Enrolled</span>`
                : `<strong>${escapeHtml(priceText(course))}</strong>`;

            card.innerHTML = `
                <img
                    class="course-thumb"
                    src="${DEFAULT_THUMB}"
                    alt="${escapeHtml(course.course_name || "Course")}"
                >

                <div class="course-body">

                    <h3>${escapeHtml(course.course_name || "")}</h3>
                    <p>${escapeHtml(course.course_details || "")}</p>

                    <div class="teacher-row">
                        ${teacher.profile_pic
                            ? `<img class="teacher-avatar" src="${escapeHtml(teacher.profile_pic)}" alt="" loading="lazy" onerror="this.remove()">`
                            : ""}
                        <span>${escapeHtml(teacherName)}</span>
                    </div>

                    <div class="rating-row">
                        <span class="rating-num">${Number(course.avg_rating || 0).toFixed(1)}</span>
                        <span class="stars">${starsText(course.avg_rating)}</span>
                        <span class="rating-count">(${formatNumber(course.total_rating)} ratings)</span>
                    </div>

                    <div class="stats-row">
                        <span>👥 ${formatNumber(course.total_enrollment)} enrolled</span>
                        <span>💬 ${formatNumber(course.total_comment)} comments</span>
                    </div>

                    <div class="tag-row">
                        ${shownTags.map(tag => `<span class="tag-pill">${escapeHtml(tagLabel(tag))}</span>`).join("")}
                        ${extraTags > 0 ? `<span class="tag-pill">+${extraTags}</span>` : ""}
                    </div>

                    <div class="course-meta">
                        <span>🌐 ${escapeHtml(course.course_language || "")}</span>
                        ${rightSide}
                    </div>

                </div>
            `;

            card.addEventListener("click", () => openCourse(course, isEnrolled));

            // Connect the thumbnail loader (lazy, cached, queued)
            attachThumbnail(card.querySelector(".course-thumb"), getCourseId(course));

            fragment.appendChild(card);
        });

        grid.appendChild(fragment);
    }


    /* ==========================================
       TAB SWITCHING (Videos <-> Documents)
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

        // Start BOTH requests at the same time
        const coursesPromise = loadCourses();
        const profilePromise = hasStudentAccount
            ? fetchStudentProfile()
            : Promise.resolve(null);

        // Wait until both have finished
        await coursesPromise;
        const profileData = await profilePromise;

        // The enrolled lookup may need the full course list, so it comes after
        await loadEnrolledCourses(profileData);

        // Draw the cards. Thumbnails are loaded later by the lazy loader.
        applyFilters();
    }

    init();

})();