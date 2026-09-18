document.addEventListener("DOMContentLoaded", function () {

    const API_URL = "http://127.0.0.1:8000/api/v1/students/me";

    const token = localStorage.getItem("access_token");

    const navItems = document.querySelectorAll(".nav-item");
    const sections = document.querySelectorAll(".page-section");

    const profileImage =
        document.getElementById("studentProfileImg");

    const userName =
        document.getElementById("studentUserName");


    // =========================================
    // LOGIN CHECK
    // =========================================

    if (!token) {
        window.location.href = "login.html";
        return;
    }


    // =========================================
    // SHOW SECTION
    // =========================================

    function showSection(sectionId) {

        sections.forEach(function (section) {
            section.classList.remove("active");
            section.hidden = true;
        });

        const selectedSection =
            document.getElementById(sectionId);

        if (selectedSection) {
            selectedSection.hidden = false;
            selectedSection.classList.add("active");
        }
    }


    // =========================================
    // SET ACTIVE SIDEBAR
    // =========================================

    function setActiveNav(page) {

        navItems.forEach(function (nav) {
            nav.classList.remove("active");
        });

        const activeNav =
            document.querySelector(
                '.nav-item[data-page="' + page + '"]'
            );

        if (activeNav) {
            activeNav.classList.add("active");
        }
    }


    // =========================================
    // SIDEBAR NAVIGATION
    // =========================================

    navItems.forEach(function (item) {

        item.addEventListener("click", function (event) {

            const page =
                item.getAttribute("data-page");


            // =====================================
            // COURSES
            // =====================================
            // Courses link যদি course_details.html হয়,
            // তাহলে browser-কে normal navigation করতে দাও.

            if (page === "courses") {

                // যদি href="course_details.html" থাকে
                const href = item.getAttribute("href");

                if (href === "course_details.html") {
                    return;
                }

                event.preventDefault();

                showSection("courses");
                setActiveNav("courses");

                window.scrollTo({
                    top: 0,
                    behavior: "smooth"
                });

                return;
            }


            // =====================================
            // LOGOUT
            // =====================================

            if (page === "logout") {

                event.preventDefault();

                logout();

                return;
            }


            // =====================================
            // QUIZ
            // =====================================

            if (page === "quiz") {

                event.preventDefault();

                showSection("quiz");
                setActiveNav("quiz");

                window.scrollTo({
                    top: 0,
                    behavior: "smooth"
                });

                return;
            }


            // =====================================
            // SETTINGS
            // =====================================

            if (page === "settings") {

                event.preventDefault();

                showSection("settings");
                setActiveNav("settings");

                loadStudentProfile();

                window.scrollTo({
                    top: 0,
                    behavior: "smooth"
                });

                return;
            }

        });

    });


    // =========================================
    // OPEN COURSE DETAILS PAGE
    // =========================================

    function openCourseDetails(courseName) {

        console.log(
            "Opening Course Details:",
            courseName
        );

        if (!courseName) {
            console.error("Course name not found!");
            return;
        }


        // Course name URL-এর মধ্যে পাঠানো হচ্ছে
        const courseURL =
            "course_details.html?course=" +
            encodeURIComponent(courseName);


        window.location.href = courseURL;
    }


    // =========================================
    // COURSE CARD CLICK
    // =========================================

    const courseGrid =
        document.querySelector(".course-grid");


    if (courseGrid) {

        courseGrid.addEventListener(
            "click",
            function (event) {

                const card =
                    event.target.closest(".course-card");


                if (!card) {
                    return;
                }


                const courseName =
                    card.getAttribute("data-course");


                console.log(
                    "Course card clicked:",
                    courseName
                );


                openCourseDetails(courseName);

            }
        );

    } else {

        console.error(
            "Course grid not found!"
        );

    }


    // =========================================
    // CONTINUE LEARNING BUTTON
    // =========================================

    const continueButtons =
        document.querySelectorAll(".btn-continue");


    continueButtons.forEach(function (button) {

        button.addEventListener(
            "click",
            function (event) {

                event.preventDefault();
                event.stopPropagation();


                const courseName =
                    button.getAttribute("data-course");


                console.log(
                    "Continue button clicked:",
                    courseName
                );


                openCourseDetails(courseName);

            }
        );

    });


    // =========================================
    // BACK TO COURSES
    // =========================================

    const backToCourses =
        document.getElementById("backToCourses");


    if (backToCourses) {

        backToCourses.addEventListener(
            "click",
            function (event) {

                event.preventDefault();

                showSection("courses");
                setActiveNav("courses");

                window.scrollTo({
                    top: 0,
                    behavior: "smooth"
                });

            }
        );

    }


    // =========================================
    // COURSE DETAILS TABS
    // =========================================

    window.switchTab = function (tab) {

        const overviewTab =
            document.getElementById("overviewTab");

        const reviewsTab =
            document.getElementById("reviewsTab");

        const tabButtons =
            document.querySelectorAll(".tab-btn");


        tabButtons.forEach(function (button) {
            button.classList.remove("active");
        });


        if (overviewTab) {
            overviewTab.classList.add("hidden");
        }

        if (reviewsTab) {
            reviewsTab.classList.add("hidden");
        }


        // OVERVIEW
        if (tab === "overview") {

            if (overviewTab) {
                overviewTab.classList.remove("hidden");
            }

            if (tabButtons[0]) {
                tabButtons[0].classList.add("active");
            }
        }


        // REVIEWS
        if (tab === "reviews") {

            if (reviewsTab) {
                reviewsTab.classList.remove("hidden");
            }

            if (tabButtons[1]) {
                tabButtons[1].classList.add("active");
            }
        }

    };


    // =========================================
    // LOAD STUDENT PROFILE
    // =========================================

    async function loadStudentProfile() {

        try {

            console.log("Calling Student API...");


            const response =
                await fetch(API_URL, {

                    method: "GET",

                    headers: {
                        "Authorization":
                            "Bearer " + token,

                        "Accept":
                            "application/json"
                    }

                });


            console.log(
                "Student API Status:",
                response.status
            );


            // =================================
            // UNAUTHORIZED
            // =================================

            if (response.status === 401) {

                console.warn(
                    "Student token expired or invalid."
                );


                localStorage.removeItem(
                    "access_token"
                );

                localStorage.removeItem(
                    "token_type"
                );

                localStorage.removeItem(
                    "userRole"
                );


                window.location.href =
                    "login.html";

                return;
            }


            const data =
                await response.json();


            console.log(
                "Student API Response:",
                data
            );


            // =================================
            // API ERROR
            // =================================

            if (!response.ok) {

                console.error(
                    "Student API Error:",
                    data
                );


                showAccountError(
                    "Unable to load account details."
                );

                return;
            }


            console.log(
                "Student details loaded successfully"
            );


            // =================================
            // STUDENT INFORMATION
            // =================================

            const firstName =
                data.first_name ||
                "Not provided";


            const lastName =
                data.last_name ||
                "Not provided";


            const email =
                data.user?.email_id ||
                data.email_id ||
                "Not provided";


            const phone =
                data.phone_no ||
                "Not provided";


            const gender =
                data.gender ||
                "Not provided";


            const dob =
                data.date_of_birth ||
                "Not provided";


            const address =
                data.address ||
                "Not provided";


            const about =
                data.about ||
                "Not provided";


            // =================================
            // TOP BAR NAME
            // =================================

            if (userName) {

                const fullName =
                    `${firstName} ${lastName}`.trim();

                userName.textContent =
                    fullName || "Student";
            }


            // =================================
            // PROFILE IMAGE
            // =================================

            console.log(
                "Profile pic from API:",
                data.profile_pic
            );


            if (profileImage) {

                if (data.profile_pic) {

                    profileImage.src =
                        data.profile_pic;

                } else {

                    profileImage.src =
                        "https://i.pravatar.cc/150?img=32";
                }


                profileImage.onerror =
                    function () {

                        this.src =
                            "https://i.pravatar.cc/150?img=32";

                    };


                console.log(
                    "Student profile picture loaded successfully."
                );
            }


            // =================================
            // DISPLAY PROFILE
            // =================================

            displayStudentProfile({

                firstName: firstName,
                lastName: lastName,
                email: email,
                phone: phone,
                gender: gender,
                dob: dob,
                address: address,
                about: about

            });

        }


        catch (error) {

            console.error(
                "Student profile error:",
                error
            );


            showAccountError(
                "Backend server-এর সাথে connection হচ্ছে না."
            );

        }

    }


    // =========================================
    // DISPLAY ACCOUNT DETAILS
    // =========================================

    function displayStudentProfile(profile) {

        const accountDetails =
            document.getElementById(
                "accountDetails"
            );


        if (!accountDetails) {

            console.error(
                "Account details section not found!"
            );

            return;
        }


        accountDetails.innerHTML = `

            <div class="account-details-card">

                <h3>Account Details</h3>

                <div class="account-details">

                    <div class="detail-row">
                        <span>First Name</span>
                        <strong>
                            ${escapeHTML(profile.firstName)}
                        </strong>
                    </div>

                    <div class="detail-row">
                        <span>Last Name</span>
                        <strong>
                            ${escapeHTML(profile.lastName)}
                        </strong>
                    </div>

                    <div class="detail-row">
                        <span>Email</span>
                        <strong>
                            ${escapeHTML(profile.email)}
                        </strong>
                    </div>

                    <div class="detail-row">
                        <span>Phone</span>
                        <strong>
                            ${escapeHTML(profile.phone)}
                        </strong>
                    </div>

                    <div class="detail-row">
                        <span>Gender</span>
                        <strong>
                            ${escapeHTML(profile.gender)}
                        </strong>
                    </div>

                    <div class="detail-row">
                        <span>Date of Birth</span>
                        <strong>
                            ${escapeHTML(profile.dob)}
                        </strong>
                    </div>

                    <div class="detail-row">
                        <span>Address</span>
                        <strong>
                            ${escapeHTML(profile.address)}
                        </strong>
                    </div>

                    <div class="detail-row">
                        <span>About Me</span>
                        <strong>
                            ${escapeHTML(profile.about)}
                        </strong>
                    </div>

                </div>


                <button
                    type="button"
                    class="update-profile-option"
                    id="openUpdateProfile">

                    Update Profile

                    <i class="fa-solid fa-arrow-right"></i>

                </button>

            </div>

        `;


        // =====================================
        // UPDATE PROFILE BUTTON
        // =====================================

        const updateButton =
            document.getElementById(
                "openUpdateProfile"
            );


        if (updateButton) {

            updateButton.addEventListener(
                "click",
                function () {

                    window.location.href =
                        "update_profile.html";

                }
            );

        }

    }


    // =========================================
    // SHOW ACCOUNT ERROR
    // =========================================

    function showAccountError(message) {

        const accountDetails =
            document.getElementById(
                "accountDetails"
            );


        if (!accountDetails) {
            return;
        }


        accountDetails.innerHTML = `

            <div class="account-details-card">

                <h3>Account Details</h3>

                <p>
                    ${escapeHTML(message)}
                </p>

            </div>

        `;

    }


    // =========================================
    // ESCAPE HTML
    // =========================================

    function escapeHTML(value) {

        return String(value)

            .replace(/&/g, "&amp;")

            .replace(/</g, "&lt;")

            .replace(/>/g, "&gt;")

            .replace(/"/g, "&quot;")

            .replace(/'/g, "&#039;");

    }


    // =========================================
    // LOGOUT
    // =========================================

    function logout() {

        localStorage.removeItem(
            "access_token"
        );

        localStorage.removeItem(
            "token_type"
        );

        localStorage.removeItem(
            "userRole"
        );


        window.location.href =
            "login.html";

    }


    // =========================================
    // INITIAL LOAD
    // =========================================

    showSection("courses");
    setActiveNav("courses");

    loadStudentProfile();

});