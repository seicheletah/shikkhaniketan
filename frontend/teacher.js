document.addEventListener("DOMContentLoaded", () => {

    const API = "http://127.0.0.1:8000/api/v1";
    const token = localStorage.getItem("access_token");

    if (!token) {
        location.href = "login.html";
        return;
    }

    // ---------------- ELEMENTS ----------------

    const topBar = document.querySelector(".top-bar");
    const navItems = document.querySelectorAll(".nav-item");
    const sections = document.querySelectorAll(".page-section");

    const teacherName = document.getElementById("teacherUserName");
    const teacherImg = document.getElementById("teacherProfileImg");

    const publishBtn = document.getElementById("publishCourseBtn");
    const updateBtn = document.getElementById("openUpdateProfile");
    const searchInput = document.getElementById("courseSearch");

    const courseList = document.getElementById("courseList");
    const templateCard = courseList?.querySelector("[data-course-card]");

    let teacher = {};
    let allCourses = [];


    // ---------------- HEADERS ----------------

    function headers() {
        return {
            Authorization: `Bearer ${token}`,
            Accept: "application/json"
        };
    }


    // ---------------- NAVIGATION ----------------

    navItems.forEach(item => {

        item.addEventListener("click", e => {

            e.preventDefault();

            const page = item.dataset.page;

            if (page === "logout") {
                localStorage.clear();
                location.href = "login.html";
                return;
            }

            navItems.forEach(n => n.classList.remove("active"));
            sections.forEach(s => s.classList.remove("active"));

            item.classList.add("active");

            const section = document.getElementById(page);

            if (section) {
                section.classList.add("active");
            }

            // Hide Search Bar in Settings
            if (page === "settings") {
                topBar?.classList.add("hide-search");
            } else {
                topBar?.classList.remove("hide-search");
            }

        });

    });


    // ---------------- PROFILE ----------------

    async function loadProfile() {

        try {

            const res = await fetch(`${API}/teachers/me`, {
                headers: headers()
            });

            if (res.status === 401) {
                localStorage.clear();
                location.href = "login.html";
                return;
            }

            if (!res.ok) {
                console.error("Profile loading failed");
                return;
            }

            teacher = await res.json();

            const fullName =
                `${teacher.first_name || ""} ${teacher.last_name || ""}`.trim();

            if (teacherName) {
                teacherName.textContent = fullName || "Teacher";
            }

            if (teacherImg && teacher.profile_pic) {
                teacherImg.src = teacher.profile_pic;
            }

            setValue("teacherFirstName", teacher.first_name);
            setValue("teacherLastName", teacher.last_name);
            setValue("teacherEmail", teacher.user?.email_id);
            setValue("teacherPhone", teacher.phone_no);
            setValue("teacherGender", teacher.gender);
            setValue("teacherDob", teacher.date_of_birth);
            setValue("teacherAddress", teacher.address);
            setValue("teacherAbout", teacher.about);

        } catch (error) {

            console.error("Profile Error:", error);

        }

    }


    function setValue(id, value) {

        const el = document.getElementById(id);

        if (el) {
            el.textContent = value || "-";
        }

    }


    // ========================================================
    // COURSE SORTING
    // ========================================================

    function getCourseCreatedTime(course) {

        /*
         * Backend যদি creation date পাঠায়,
         * তাহলে সেটাই সবচেয়ে আগে ব্যবহার হবে।
         */

        const dateValue =
            course.created_at ||
            course.createdAt ||
            course.created ||
            course.creation_date ||
            course.created_date ||
            course.uploaded_at ||
            course.uploadedAt;

        if (dateValue) {

            const time = new Date(dateValue).getTime();

            if (!isNaN(time)) {
                return time;
            }

        }


        /*
         * যদি backend creation date না পাঠায়,
         * তাহলে UUID v7 ID থেকে timestamp বের করার চেষ্টা করা হবে।
         *
         * UUID v7-এর প্রথম 48 bit-এ creation timestamp থাকে।
         */

        const id = String(course.id || "");

        const uuidV7Match =
            id.match(
                /^([0-9a-f]{8})-([0-9a-f]{4})-/i
            );

        if (uuidV7Match) {

            try {

                const firstPart =
                    uuidV7Match[1] +
                    uuidV7Match[2];

                const timestamp =
                    parseInt(firstPart, 16);

                if (!isNaN(timestamp) && timestamp > 0) {
                    return timestamp;
                }

            } catch (error) {

                console.warn(
                    "Could not read course creation time from ID:",
                    id
                );

            }

        }


        /*
         * Creation date এবং UUID timestamp দুটোই না থাকলে
         * course-কে নিচে রাখার জন্য 0 return করা হবে।
         */

        return 0;
    }


    function sortNewestFirst(courses) {

        return [...courses].sort((a, b) => {

            const timeA = getCourseCreatedTime(a);
            const timeB = getCourseCreatedTime(b);

            return timeB - timeA;

        });

    }


    // ---------------- LOAD COURSES ----------------

    async function loadCourses() {

        try {

            const res = await fetch(`${API}/teachers/me/courses`, {
                headers: headers()
            });

            if (res.status === 401) {

                localStorage.clear();
                location.href = "login.html";
                return;

            }

            if (!res.ok) {

                if (courseList) {
                    courseList.innerHTML =
                        "<p>No courses found.</p>";
                }

                return;
            }

            const data = await res.json();

            allCourses = Array.isArray(data)
                ? data
                : (data.courses || []);


            // ====================================================
            // NEWEST COURSE FIRST
            // ====================================================

            allCourses = sortNewestFirst(allCourses);


            // Load rating separately for every course
            await loadRatingsForCourses();


            // Render newest course first
            renderCourses(allCourses);

        } catch (error) {

            console.error("Course Loading Error:", error);

            if (courseList) {
                courseList.innerHTML =
                    "<p>Failed to load courses.</p>";
            }

        }

    }


    // ---------------- LOAD RATINGS FOR EACH COURSE ----------------

    async function loadRatingsForCourses() {

        await Promise.all(

            allCourses.map(async course => {

                try {

                    const res = await fetch(
                        `${API}/courses/${course.id}/review`,
                        {
                            headers: headers()
                        }
                    );

                    if (!res.ok) {

                        course.average_rating = 0;
                        course.total_reviews = 0;

                        return;
                    }

                    const data = await res.json();

                    let reviews = [];

                    if (Array.isArray(data)) {

                        reviews = data;

                    } else if (Array.isArray(data.reviews)) {

                        reviews = data.reviews;

                    }


                    // If backend directly sends average rating
                    if (
                        data &&
                        !Array.isArray(data) &&
                        data.average_rating !== undefined
                    ) {

                        course.average_rating =
                            Number(data.average_rating) || 0;

                        course.total_reviews =
                            Number(
                                data.total_reviews ??
                                data.review_count ??
                                reviews.length
                            ) || 0;

                        return;
                    }


                    // Calculate average rating from reviews
                    if (reviews.length > 0) {

                        const ratings = reviews
                            .map(review => Number(review.rating))
                            .filter(rating => !isNaN(rating));


                        if (ratings.length > 0) {

                            const total = ratings.reduce(
                                (sum, rating) => sum + rating,
                                0
                            );

                            course.average_rating =
                                total / ratings.length;

                            course.total_reviews =
                                ratings.length;

                        } else {

                            course.average_rating = 0;
                            course.total_reviews = 0;

                        }

                    } else {

                        course.average_rating = 0;
                        course.total_reviews = 0;

                    }

                } catch (error) {

                    console.error(
                        `Rating loading failed for course ${course.id}:`,
                        error
                    );

                    course.average_rating = 0;
                    course.total_reviews = 0;

                }

            })

        );

    }


    // ---------------- RESOURCE TYPE ----------------

    function getResourceType(course) {

        const type =
            course.course_resource_type ||
            course.resource_type ||
            course.course_type ||
            course.type ||
            "video";

        const value = String(type).toLowerCase();

        if (
            value.includes("document") ||
            value.includes("pdf") ||
            value.includes("doc")
        ) {

            return "Document";

        }

        return "Video";
    }


    // ---------------- RATING DISPLAY ----------------

    function getRating(course) {

        const rating = Number(
            course.average_rating ??
            course.rating ??
            course.course_rating ??
            0
        );

        return isNaN(rating) ? 0 : rating;

    }


    // ---------------- ADD COURSE EXTRA INFO ----------------

    function addCourseExtraInfo(card, course) {

        const metrics = card.querySelector(".course-metrics");

        if (!metrics) return;


        // Remove previously added information

        metrics
            .querySelectorAll(".dynamic-course-info")
            .forEach(el => el.remove());


        // ---------------- RATING ----------------

        const rating = getRating(course);

        const totalReviews =
            Number(
                course.total_reviews ??
                course.review_count ??
                0
            ) || 0;


        const ratingMetric =
            document.createElement("div");

        ratingMetric.className =
            "metric dynamic-course-info course-rating";

        ratingMetric.innerHTML = `
            <span>Rating</span>

            <strong>
                ⭐ ${rating > 0 ? rating.toFixed(1) : "No rating"}
            </strong>

            <small>
                ${totalReviews}
                ${totalReviews === 1 ? "Review" : "Reviews"}
            </small>
        `;

        metrics.appendChild(ratingMetric);


        // ---------------- RESOURCE TYPE ----------------

        const resourceType =
            getResourceType(course);

        const typeMetric =
            document.createElement("div");

        typeMetric.className =
            "metric dynamic-course-info course-resource-type";


        const icon =
            resourceType === "Document"
                ? "fa-file-lines"
                : "fa-video";


        typeMetric.innerHTML = `
            <span>Type</span>

            <strong>
                <i class="fa-solid ${icon}"></i>
                ${resourceType}
            </strong>
        `;

        metrics.appendChild(typeMetric);

    }


    // ---------------- RENDER COURSES ----------------

    function renderCourses(courses) {

        if (!courseList || !templateCard) return;

        courseList.innerHTML = "";


        if (courses.length === 0) {

            courseList.innerHTML =
                "<p>No courses found.</p>";

            return;
        }


        /*
         * Render করার আগেও newest-first sorting করা হচ্ছে।
         * এতে Search/Back থেকেও order ঠিক থাকবে।
         */

        const sortedCourses =
            sortNewestFirst(courses);


        sortedCourses.forEach(course => {

            const card =
                templateCard.cloneNode(true);

            card.style.display = "";


            // ---------------- COURSE NAME ----------------

            const courseName =
                card.querySelector("[data-course-name]");

            if (courseName) {

                courseName.textContent =
                    course.course_name || "Course Name";

            }


            // ---------------- COURSE DETAILS ----------------

            const courseDetails =
                card.querySelector("[data-course-details]");

            if (courseDetails) {

                courseDetails.textContent =
                    course.course_details || "Course details";

            }


            // ---------------- LANGUAGE ----------------

            const courseLanguage =
                card.querySelector("[data-course-language]");

            if (courseLanguage) {

                courseLanguage.textContent =
                    course.course_language || "-";

            }


            // ---------------- PRICE ----------------

            const coursePrice =
                card.querySelector("[data-course-price]");

            if (coursePrice) {

                const isPaid =
                    course.course_paid === true ||
                    course.course_paid === 1 ||
                    course.course_paid === "true" ||
                    course.course_paid === "1";


                if (isPaid) {

                    const currency =
                        course.course_price_currency || "₹";

                    coursePrice.textContent =
                        `${currency} ${course.course_price ?? 0}`;

                } else {

                    coursePrice.textContent =
                        "Free";

                }

            }


            // ---------------- RATING + TYPE ----------------

            addCourseExtraInfo(card, course);


            // ---------------- EDIT BUTTON ----------------

            const editBtn =
                card.querySelector("[data-edit-course]");

            if (editBtn) {

                editBtn.textContent =
                    "Edit Course";

                editBtn.onclick = e => {

                    e.stopPropagation();

                    // Open Edit Course page with course ID
                    location.href =
                        `edit_course.html?id=${encodeURIComponent(course.id)}`;

                };

            }


            // ---------------- COURSE CLICK ----------------

            card.onclick = () => {
    location.href = `course_details.html?id=${encodeURIComponent(course.id)}`;
};


            courseList.appendChild(card);

        });

    }


    // ---------------- COURSE DETAILS ----------------

    function showCourse(course) {

        if (!courseList || !templateCard) return;

        courseList.innerHTML = "";


        const detailCard =
            templateCard.cloneNode(true);

        detailCard.style.display = "";


        // ---------------- NAME ----------------

        const courseName =
            detailCard.querySelector("[data-course-name]");

        if (courseName) {

            courseName.textContent =
                course.course_name || "Course Name";

        }


        // ---------------- DETAILS ----------------

        const courseDetails =
            detailCard.querySelector("[data-course-details]");

        if (courseDetails) {

            courseDetails.textContent =
                course.course_details || "Course details";

        }


        // ---------------- LANGUAGE ----------------

        const courseLanguage =
            detailCard.querySelector("[data-course-language]");

        if (courseLanguage) {

            courseLanguage.textContent =
                course.course_language || "-";

        }


        // ---------------- PRICE ----------------

        const coursePrice =
            detailCard.querySelector("[data-course-price]");

        if (coursePrice) {

            const isPaid =
                course.course_paid === true ||
                course.course_paid === 1 ||
                course.course_paid === "true" ||
                course.course_paid === "1";


            if (isPaid) {

                const currency =
                    course.course_price_currency || "₹";

                coursePrice.textContent =
                    `${currency} ${course.course_price ?? 0}`;

            } else {

                coursePrice.textContent =
                    "Free";

            }

        }


        // ---------------- RATING + TYPE ----------------

        addCourseExtraInfo(detailCard, course);


        // ---------------- BACK BUTTON ----------------

        const backBtn =
            detailCard.querySelector("[data-edit-course]");

        if (backBtn) {

            backBtn.textContent = "Back";

            backBtn.onclick = e => {

                e.stopPropagation();

                renderCourses(allCourses);

            };

        }


        // Prevent detail card click

        detailCard.onclick = e => {

            e.stopPropagation();

        };


        courseList.appendChild(detailCard);

    }


    // ---------------- SEARCH ----------------

    searchInput?.addEventListener("input", () => {

        const text =
            searchInput.value.trim().toLowerCase();


        const filtered =
            allCourses.filter(course =>

                (course.course_name || "")
                    .toLowerCase()
                    .includes(text)

            );


        /*
         * Search result-ও newest course আগে দেখাবে।
         */

        renderCourses(
            sortNewestFirst(filtered)
        );

    });


    // ---------------- PUBLISH BUTTON ----------------

    publishBtn?.addEventListener("click", () => {

        location.href = "add_course.html";

    });


    // ---------------- UPDATE PROFILE ----------------

    updateBtn?.addEventListener("click", () => {

        location.href = "update_profile.html";

    });


    // ---------------- INIT ----------------

    loadProfile();
    loadCourses();

});