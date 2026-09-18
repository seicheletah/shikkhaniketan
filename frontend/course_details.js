document.addEventListener("DOMContentLoaded", function () {

    const API_URL =
        "http://127.0.0.1:8000/api/v1/students/me";

    const token =
        localStorage.getItem("access_token");


    // =========================================
    // LOGIN CHECK
    // =========================================

    if (!token) {
        window.location.href = "login.html";
        return;
    }


    // =========================================
    // ELEMENTS
    // =========================================

    const contentBody =
        document.querySelector(".content-body");

    const navItems =
        document.querySelectorAll(".nav-item");


    // =========================================
    // COURSE PAGE
    // =========================================

    function showCoursePage() {

        // Course Details page already has
        // the original HTML content.
        // So reload the original page content.

        window.location.reload();

    }


    // =========================================
    // SIDEBAR NAVIGATION
    // =========================================

    navItems.forEach(function (item) {

        item.addEventListener("click", function (event) {

            const text =
                item.textContent.trim().toLowerCase();


            // =====================================
            // COURSES
            // =====================================

            if (text === "courses") {

                event.preventDefault();

                navItems.forEach(function (nav) {
                    nav.classList.remove("active");
                });

                item.classList.add("active");

                showCoursePage();

                return;
            }


            // =====================================
            // SETTINGS
            // =====================================

            if (text === "settings") {

                event.preventDefault();

                navItems.forEach(function (nav) {
                    nav.classList.remove("active");
                });

                item.classList.add("active");

                loadStudentProfile();

                return;
            }


            // =====================================
            // LOGOUT
            // =====================================

            if (
                text === "logout" ||
                item.classList.contains("logout")
            ) {

                event.preventDefault();

                logout();

                return;
            }

        });

    });


    // =========================================
    // COURSE DETAILS TABS
    // =========================================

    window.switchTab = function (tabName) {

        const overviewTab =
            document.getElementById("overviewTab");

        const reviewsTab =
            document.getElementById("reviewsTab");

        const tabButtons =
            document.querySelectorAll(".tab-btn");


        // Remove active
        tabButtons.forEach(function (button) {
            button.classList.remove("active");
        });


        // Hide all
        if (overviewTab) {
            overviewTab.classList.add("hidden");
        }

        if (reviewsTab) {
            reviewsTab.classList.add("hidden");
        }


        // Overview
        if (tabName === "overview") {

            if (overviewTab) {
                overviewTab.classList.remove("hidden");
            }

            if (tabButtons[0]) {
                tabButtons[0].classList.add("active");
            }

        }


        // Reviews
        if (tabName === "reviews") {

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

            console.log(
                "Loading student account details..."
            );


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


            // =====================================
            // UNAUTHORIZED
            // =====================================

            if (response.status === 401) {

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
                "Student account data:",
                data
            );


            // =====================================
            // API ERROR
            // =====================================

            if (!response.ok) {

                showAccountError(
                    "Unable to load account details."
                );

                return;
            }


            // =====================================
            // ACCOUNT DETAILS
            // =====================================

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


            // =====================================
            // TOP BAR NAME
            // =====================================

            const userName =
                document.querySelector(".user-name");

            if (userName) {

                userName.textContent =
                    `${firstName} ${lastName}`.trim();

            }


            // =====================================
            // SHOW ACCOUNT DETAILS
            // =====================================

            showAccountDetails({

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
    // SHOW ACCOUNT DETAILS
    // =========================================

    function showAccountDetails(profile) {

        if (!contentBody) {
            return;
        }


        contentBody.innerHTML = `

            <div class="settings-page">

                <div class="settings-header">

                    <h2>Account Settings</h2>

                    <p>
                        Your account information
                    </p>

                </div>


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

            </div>

        `;


        // =====================================
        // UPDATE PROFILE
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
    // ERROR
    // =========================================

    function showAccountError(message) {

        if (!contentBody) {
            return;
        }


        contentBody.innerHTML = `

            <div class="settings-page">

                <div class="account-details-card">

                    <h3>Account Details</h3>

                    <p>
                        ${escapeHTML(message)}
                    </p>

                </div>

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

    console.log(
        "Course Details page loaded."
    );

});

function openCourseView() {
    window.location.href = "course_view.html";
}