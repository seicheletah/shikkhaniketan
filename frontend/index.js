document.addEventListener("DOMContentLoaded", () => {

    const API_BASE = "http://127.0.0.1:8000/api/v1";

    const searchInput =
        document.querySelector(".search-box input");

    const searchButton =
        document.querySelector(".search-box i");

    const courseGrid =
        document.getElementById("homeCourseGrid");

    const popularCoursesSection =
        document.querySelector(".popular-courses");

    let allCourses = [];


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

            const token =
                localStorage.getItem("access_token");

            const headers = {
                Accept: "application/json"
            };

            if (token) {

                headers.Authorization =
                    `Bearer ${token}`;

            }


            const res = await fetch(
                `${API_BASE}/courses/${courseId}/media/thumbnail/access`,
                {
                    method: "GET",
                    headers
                }
            );


            if (!res.ok) {

                console.log(
                    `Thumbnail not available for course: ${courseId}`
                );

                return null;

            }


            const data =
                await res.json();


            /*
             * Teacher-এর uploaded thumbnail
             */

            if (data && data.stream_url) {

                return data.stream_url;

            }


            return null;


        } catch (error) {

            console.log(
                `Thumbnail loading error for course ${courseId}:`,
                error
            );

            return null;

        }

    }


    // ==========================================
    // LOAD COURSES
    // ==========================================

    async function loadCourses() {

        try {

            const token =
                localStorage.getItem("access_token");


            const headers = {
                Accept: "application/json"
            };


            if (token) {

                headers.Authorization =
                    `Bearer ${token}`;

            }


            const res = await fetch(
                `${API_BASE}/courses/`,
                {
                    method: "GET",
                    headers
                }
            );


            if (!res.ok) {

                throw new Error(
                    `Failed to load courses: ${res.status}`
                );

            }


            const data =
                await res.json();


            allCourses = Array.isArray(data)
                ? data
                : (data.courses || []);


            renderCourses();


        } catch (error) {

            console.log(
                "Course loading error:",
                error
            );

        }

    }


    // ==========================================
    // CREATE COURSE CARD
    // ==========================================

    function createCourseCard(course) {

        const card =
            document.createElement("div");

        card.className =
            "course-card";


        // --------------------------------------
        // THUMBNAIL
        // --------------------------------------

        const thumbnail =
            document.createElement("img");

        thumbnail.className =
            "course-thumb";

        thumbnail.alt =
            course.course_name ||
            "Course Thumbnail";


        /*
         * কোনো default thumbnail নেই।
         */

        thumbnail.style.display =
            "none";


        thumbnail.onerror = () => {

            thumbnail.onerror = null;

            thumbnail.style.display =
                "none";

        };


        // --------------------------------------
        // COURSE BODY
        // --------------------------------------

        const courseBody =
            document.createElement("div");

        courseBody.className =
            "course-body";


        // --------------------------------------
        // COURSE NAME
        // --------------------------------------

        const courseName =
            document.createElement("h3");

        courseName.textContent =
            course.course_name || "";


        // --------------------------------------
        // COURSE DETAILS
        // --------------------------------------

        const courseDetails =
            document.createElement("p");

        courseDetails.textContent =
            course.course_details || "";


        // --------------------------------------
        // COURSE META
        // --------------------------------------

        const courseMeta =
            document.createElement("div");

        courseMeta.className =
            "course-meta";


        // Language

        const language =
            document.createElement("span");

        language.textContent =
            course.course_language || "";


        // Price

        const price =
            document.createElement("strong");


        if (isPaid(course)) {

            price.textContent =
                "₹" +
                (course.course_price || 0);

        } else {

            price.textContent =
                "Free";

        }


        // --------------------------------------
        // BUILD CARD
        // --------------------------------------

        courseMeta.appendChild(language);

        courseMeta.appendChild(price);

        courseBody.appendChild(courseName);

        courseBody.appendChild(courseDetails);

        courseBody.appendChild(courseMeta);

        card.appendChild(thumbnail);

        card.appendChild(courseBody);


        // --------------------------------------
        // COURSE CLICK
        // --------------------------------------

        card.addEventListener("click", () => {

            localStorage.setItem(
                "selected_course_id",
                course.id
            );


            window.location.href =
                `course_details.html?id=${course.id}`;

        });


        /*
         * Card তৈরি হওয়ার সময় thumbnail-এর জন্য
         * কোনো await করা হচ্ছে না।
         */

        return card;

    }


    // ==========================================
    // LOAD THUMBNAIL AFTER CARD IS DISPLAYED
    // ==========================================

    async function loadThumbnail(
        course,
        card
    ) {

        const thumbnail =
            card.querySelector(".course-thumb");


        if (!thumbnail) {

            return;

        }


        const thumbnailUrl =
            await getThumbnailUrl(course.id);


        /*
         * Thumbnail response আসার পর
         * শুধু image update হবে।
         */

        if (thumbnailUrl) {

            thumbnail.src =
                thumbnailUrl;

            thumbnail.style.display =
                "block";

        }

    }


    // ==========================================
    // RENDER COURSES
    // ==========================================

    function renderCourses(
        coursesToShow = allCourses.slice(0, 8),
        highlightCourseId = null
    ) {

        /*
         * পুরনো cards remove
         */

        while (courseGrid.firstChild) {

            courseGrid.removeChild(
                courseGrid.firstChild
            );

        }


        /*
         * সর্বোচ্চ ৮টি course
         */

        const courses =
            coursesToShow.slice(0, 8);


        if (!courses.length) {

            return;

        }


        const thumbnailTasks = [];


        /*
         * প্রথমে সব card তৈরি হবে।
         * এখানে কোনো API-এর জন্য wait হবে না।
         */

        for (const course of courses) {

            const card =
                createCourseCard(course);


            courseGrid.appendChild(card);


            /*
             * Search করা course হলে
             * সঙ্গে সঙ্গে highlight হবে।
             */

            if (
                highlightCourseId &&
                String(course.id) ===
                String(highlightCourseId)
            ) {

                card.classList.add(
                    "search-highlight"
                );

            }


            /*
             * Thumbnail আলাদাভাবে load হবে।
             */

            thumbnailTasks.push(
                loadThumbnail(course, card)
            );

        }


        /*
         * সব thumbnail একসাথে load হবে।
         * একটি thumbnail-এর জন্য অন্যটির
         * জন্য অপেক্ষা করবে না।
         */

        Promise.all(thumbnailTasks)
            .catch(error => {

                console.log(
                    "Thumbnail loading error:",
                    error
                );

            });


        /*
         * Search করা course-এর highlight
         * 3 seconds থাকবে।
         */

        if (highlightCourseId) {

            setTimeout(() => {

                const highlightedCard =
                    courseGrid.querySelector(
                        ".search-highlight"
                    );


                if (highlightedCard) {

                    highlightedCard.classList.remove(
                        "search-highlight"
                    );

                }

            }, 3000);

        }

    }


    // ==========================================
    // SEARCH COURSE
    // ==========================================

    function searchCourse() {

        const searchText =
            searchInput.value
                .trim()
                .toLowerCase();


        /*
         * Search box empty হলে
         * normal ৮টা course দেখাবে।
         */

        if (!searchText) {

            renderCourses();

            return;

        }


        /*
         * Course name দিয়ে search
         */

        const matchedCourse =
            allCourses.find(course => {

                const courseName =
                    (course.course_name || "")
                        .toLowerCase()
                        .trim();


                return courseName.includes(
                    searchText
                );

            });


        /*
         * Course পাওয়া গেলে
         */

        if (matchedCourse) {

            /*
             * Search করা course বাদ দিয়ে
             * বাকি courseগুলো নেওয়া হচ্ছে।
             */

            const otherCourses =
                allCourses.filter(course =>
                    String(course.id) !==
                    String(matchedCourse.id)
                );


            /*
             * Search করা course
             * প্রথম position-এ থাকবে।
             */

            const reorderedCourses = [
                matchedCourse,
                ...otherCourses
            ];


            /*
             * মোট ৮টি course
             */

            const coursesToShow =
                reorderedCourses.slice(0, 8);


            /*
             * সঙ্গে সঙ্গে render হবে।
             */

            renderCourses(
                coursesToShow,
                matchedCourse.id
            );


            /*
             * Popular Courses section-এ
             * smooth scroll
             */

            popularCoursesSection.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });


            return;

        }


        /*
         * Course না পাওয়া গেলে
         * normal ৮টি course দেখাবে।
         */

        renderCourses();

    }


    // ==========================================
    // SEARCH ICON CLICK
    // ==========================================

    searchButton.addEventListener(
        "click",
        searchCourse
    );


    // ==========================================
    // ENTER KEY SEARCH
    // ==========================================

    searchInput.addEventListener(
        "keydown",
        (event) => {

            if (event.key === "Enter") {

                searchCourse();

            }

        }
    );


    // ==========================================
    // INITIAL LOAD
    // ==========================================

    loadCourses();

});
