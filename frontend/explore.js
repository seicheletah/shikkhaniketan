document.addEventListener("DOMContentLoaded", () => {

    // ==========================================
    // API
    // ==========================================

    const API_BASE =
        "http://127.0.0.1:8000/api/v1";


    // ==========================================
    // ELEMENTS
    // ==========================================

    const searchInput =
        document.querySelector(".search-box input");

    const sortSelect =
        document.getElementById("sort");

    const courseGrid =
        document.getElementById("courseGrid");

    const videoTab =
        document.getElementById("videoTab");

    const documentTab =
        document.getElementById("documentTab");


    // ==========================================
    // COURSE DATA
    // ==========================================

    let allCourses = [];

    let currentType = "video";


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
    // GET COURSE SORT VALUE
    // ==========================================

    function getCourseSortValue(course) {

        /*
         * First priority:
         * created_at
         */

        if (course.created_at) {

            const time =
                new Date(course.created_at).getTime();

            if (!isNaN(time)) {
                return time;
            }

        }


        /*
         * Second priority:
         * createdAt
         */

        if (course.createdAt) {

            const time =
                new Date(course.createdAt).getTime();

            if (!isNaN(time)) {
                return time;
            }

        }


        /*
         * Third priority:
         * created
         */

        if (course.created) {

            const time =
                new Date(course.created).getTime();

            if (!isNaN(time)) {
                return time;
            }

        }


        /*
         * Final fallback:
         * Course ID
         *
         * This is useful when backend
         * uses time-sortable UUIDs.
         */

        return course.id || "";

    }


    // ==========================================
    // SORT NEWEST FIRST
    // ==========================================

    function sortNewestFirst(courses) {

        return courses.sort((a, b) => {

            const valueA =
                getCourseSortValue(a);

            const valueB =
                getCourseSortValue(b);


            /*
             * Date / timestamp sorting
             */

            if (
                typeof valueA === "number" &&
                typeof valueB === "number"
            ) {

                return valueB - valueA;

            }


            /*
             * ID fallback sorting
             */

            return String(valueB)
                .localeCompare(
                    String(valueA)
                );

        });

    }


    // ==========================================
    // GET AUTH HEADERS
    // ==========================================

    function getHeaders() {

        const token =
            localStorage.getItem("access_token");

        const headers = {
            Accept: "application/json"
        };

        if (token) {

            headers.Authorization =
                `Bearer ${token}`;

        }

        return headers;

    }


    // ==========================================
    // GET COURSE THUMBNAIL
    // ==========================================

    async function getThumbnailUrl(courseId) {

        try {

            const response =
                await fetch(
                    `${API_BASE}/courses/${encodeURIComponent(courseId)}/media/thumbnail/access`,
                    {
                        method: "GET",
                        headers: getHeaders()
                    }
                );


            if (!response.ok) {

                return "image/myyy.png";

            }


            const data =
                await response.json();


            /*
             * Backend normally returns:
             * {
             *     stream_url: "..."
             * }
             */

            if (
                data &&
                data.stream_url
            ) {

                return data.stream_url;

            }


            return "image/myyy.png";

        }

        catch (error) {

            console.log(
                `Thumbnail loading error for course ${courseId}:`,
                error
            );

            return "image/myyy.png";

        }

    }


    // ==========================================
    // LOAD COURSES
    // ==========================================

    async function loadCourses() {

        try {

            const response =
                await fetch(
                    `${API_BASE}/courses/`,
                    {
                        method: "GET",
                        headers: getHeaders()
                    }
                );


            if (!response.ok) {

                throw new Error(
                    `Failed to load courses: ${response.status}`
                );

            }


            const data =
                await response.json();


            /*
             * API can return:
             *
             * [
             *   {...},
             *   {...}
             * ]
             *
             * OR
             *
             * {
             *   courses: [...]
             * }
             */

            allCourses =
                Array.isArray(data)
                    ? data
                    : (data.courses || []);


            console.log(
                "Courses loaded:",
                allCourses
            );


            /*
             * Apply default sorting/filtering
             */

            applyFilters();

        }

        catch (error) {

            console.error(
                "Course loading error:",
                error
            );


            if (courseGrid) {

                courseGrid.innerHTML = `
                    <p class="no-courses">
                        Unable to load courses.
                    </p>
                `;

            }

        }

    }


    // ==========================================
    // APPLY FILTERS + SEARCH + SORT
    // ==========================================

    function applyFilters() {

        if (!courseGrid) {
            return;
        }


        /*
         * Start with all courses
         */

        let courses =
            [...allCourses];


        // ======================================
        // RESOURCE TYPE FILTER
        // ======================================

        courses =
            courses.filter(course => {

                const resourceType =
                    String(
                        course.course_resource_type || ""
                    )
                        .toLowerCase()
                        .trim();


                /*
                 * Video tab
                 */

                if (currentType === "video") {

                    return (
                        resourceType === "video" ||
                        resourceType === "videos"
                    );

                }


                /*
                 * Document tab
                 */

                if (currentType === "document") {

                    return (
                        resourceType === "document" ||
                        resourceType === "documents" ||
                        resourceType === "doc"
                    );

                }


                return true;

            });


        // ======================================
        // SEARCH
        // ======================================

        const searchText =
            searchInput
                ? searchInput.value
                    .trim()
                    .toLowerCase()
                : "";


        if (searchText) {

            courses =
                courses.filter(course => {

                    const name =
                        String(
                            course.course_name || ""
                        )
                            .toLowerCase();


                    const details =
                        String(
                            course.course_details || ""
                        )
                            .toLowerCase();


                    const language =
                        String(
                            course.course_language || ""
                        )
                            .toLowerCase();


                    return (
                        name.includes(searchText) ||
                        details.includes(searchText) ||
                        language.includes(searchText)
                    );

                });

        }


        // ======================================
        // SORT / PAID / FREE
        // ======================================

        const sortValue =
            sortSelect
                ? sortSelect.value
                : "newest";


        /*
         * PAID COURSES
         */

        if (sortValue === "paid") {

            courses =
                courses.filter(course =>
                    isPaid(course)
                );


            sortNewestFirst(courses);

        }


        /*
         * FREE COURSES
         */

        else if (sortValue === "free") {

            courses =
                courses.filter(course =>
                    !isPaid(course)
                );


            sortNewestFirst(courses);

        }


        /*
         * NEWEST
         */

        else if (sortValue === "newest") {

            sortNewestFirst(courses);

        }


        /*
         * DEFAULT
         *
         * If dropdown value is empty,
         * unknown, or default.
         */

        else {

            sortNewestFirst(courses);

        }


        // ======================================
        // RENDER
        // ======================================

        renderCourses(courses);

    }


    // ==========================================
    // CREATE COURSE CARD
    // ==========================================

    async function createCourseCard(course) {

        const card =
            document.createElement("div");


        card.className =
            "course-card";


        // ======================================
        // THUMBNAIL
        // ======================================

        const thumbnail =
            document.createElement("img");


        thumbnail.className =
            "course-thumb";


        thumbnail.alt =
            course.course_name ||
            "Course Thumbnail";


        thumbnail.src =
            "image/myyy.png";


        thumbnail.onerror =
            function () {

                this.onerror = null;

                this.src =
                    "image/myyy.png";

            };


        // ======================================
        // COURSE BODY
        // ======================================

        const courseBody =
            document.createElement("div");


        courseBody.className =
            "course-body";


        // ======================================
        // COURSE NAME
        // ======================================

        const courseName =
            document.createElement("h3");


        courseName.textContent =
            course.course_name ||
            "Untitled Course";


        // ======================================
        // COURSE DETAILS
        // ======================================

        const courseDetails =
            document.createElement("p");


        courseDetails.textContent =
            course.course_details ||
            "";


        // ======================================
        // COURSE META
        // ======================================

        const courseMeta =
            document.createElement("div");


        courseMeta.className =
            "course-meta";


        // ======================================
        // LANGUAGE
        // ======================================

        const language =
            document.createElement("span");


        language.textContent =
            course.course_language ||
            "";


        // ======================================
        // PRICE
        // ======================================

        const price =
            document.createElement("strong");


        if (isPaid(course)) {

            price.textContent =
                "₹" +
                (
                    course.course_price || 0
                );

        }

        else {

            price.textContent =
                "Free";

        }


        // ======================================
        // BUILD CARD
        // ======================================

        courseMeta.appendChild(
            language
        );

        courseMeta.appendChild(
            price
        );


        courseBody.appendChild(
            courseName
        );

        courseBody.appendChild(
            courseDetails
        );

        courseBody.appendChild(
            courseMeta
        );


        card.appendChild(
            thumbnail
        );

        card.appendChild(
            courseBody
        );


        // ======================================
        // COURSE CLICK
        // ======================================

        card.addEventListener(
            "click",
            function () {

                if (!course.id) {

                    console.error(
                        "Course ID not found."
                    );

                    return;

                }


                localStorage.setItem(
                    "selected_course_id",
                    course.id
                );


                window.location.href =
                    `course_details.html?id=${encodeURIComponent(course.id)}`;

            }
        );


        // ======================================
        // LOAD THUMBNAIL
        // ======================================

        const thumbnailUrl =
            await getThumbnailUrl(
                course.id
            );


        if (thumbnailUrl) {

            thumbnail.src =
                thumbnailUrl;

        }


        return card;

    }


    // ==========================================
    // RENDER COURSES
    // ==========================================

    async function renderCourses(
        courses
    ) {

        /*
         * Clear old cards
         */

        while (
            courseGrid.firstChild
        ) {

            courseGrid.removeChild(
                courseGrid.firstChild
            );

        }


        // ======================================
        // NO COURSES
        // ======================================

        if (!courses.length) {

            courseGrid.innerHTML = `
                <p class="no-courses">
                    No courses found.
                </p>
            `;

            return;

        }


        // ======================================
        // CREATE CARDS
        // ======================================

        /*
         * Create all cards together.
         * Thumbnail loading happens in parallel.
         */

        const cardPromises =
            courses.map(course =>
                createCourseCard(course)
            );


        const cards =
            await Promise.all(
                cardPromises
            );


        cards.forEach(card => {

            courseGrid.appendChild(
                card
            );

        });

    }


    // ==========================================
    // SEARCH
    // ==========================================

    if (searchInput) {

        searchInput.addEventListener(
            "input",
            function () {

                applyFilters();

            }
        );

    }


    // ==========================================
    // SORT
    // ==========================================

    if (sortSelect) {

        sortSelect.addEventListener(
            "change",
            function () {

                applyFilters();

            }
        );

    }


    // ==========================================
    // VIDEO TAB
    // ==========================================

    if (videoTab) {

        videoTab.addEventListener(
            "click",
            function () {

                currentType =
                    "video";


                /*
                 * Active tab
                 */

                videoTab.classList.add(
                    "active"
                );


                if (documentTab) {

                    documentTab.classList.remove(
                        "active"
                    );

                }


                applyFilters();

            }
        );

    }


    // ==========================================
    // DOCUMENT TAB
    // ==========================================

    if (documentTab) {

        documentTab.addEventListener(
            "click",
            function () {

                currentType =
                    "document";


                /*
                 * Active tab
                 */

                documentTab.classList.add(
                    "active"
                );


                if (videoTab) {

                    videoTab.classList.remove(
                        "active"
                    );

                }


                applyFilters();

            }
        );

    }


    // ==========================================
    // INITIAL LOAD
    // ==========================================

    loadCourses();

});