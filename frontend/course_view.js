document.addEventListener("DOMContentLoaded", function () {

    /* =========================================
       API & TOKEN
    ========================================= */

    const API_URL =
        "http://127.0.0.1:8000/api/v1/students/me";

    const token =
        localStorage.getItem("access_token");


    /* =========================================
       LOGIN CHECK
    ========================================= */

    if (!token) {
        window.location.href = "login.html";
        return;
    }


    /* =========================================
       ELEMENTS
    ========================================= */

    const contentBody =
        document.querySelector(".content-body");

    const navItems =
        document.querySelectorAll(".nav-item");


    /* =========================================
       LOAD STUDENT PROFILE
    ========================================= */

    async function loadStudentProfile() {

        try {

            console.log("Loading student account details...");

            const response = await fetch(API_URL, {

                method: "GET",

                headers: {
                    "Authorization": "Bearer " + token,
                    "Accept": "application/json"
                }

            });


            console.log(
                "Student API Status:",
                response.status
            );


            /* TOKEN EXPIRED / INVALID */

            if (response.status === 401) {

                localStorage.removeItem("access_token");
                localStorage.removeItem("token_type");
                localStorage.removeItem("userRole");

                window.location.href = "login.html";

                return;
            }


            const data =
                await response.json();


            console.log(
                "Student account data:",
                data
            );


            if (!response.ok) {

                showAccountError(
                    "Unable to load account details."
                );

                return;
            }


            /* =====================================
               GET ACCOUNT DETAILS
            ===================================== */

            const firstName =
                data.first_name || "Not provided";

            const lastName =
                data.last_name || "Not provided";

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


            /* =====================================
               UPDATE TOP PROFILE NAME
            ===================================== */

            const userName =
                document.querySelector(".user-name");

            if (userName) {

                userName.textContent =
                    `${firstName} ${lastName}`.trim();

            }


            /* =====================================
               UPDATE TOP PROFILE IMAGE
            ===================================== */

            const topProfileImage =
                document.querySelector(".user-profile img");


            if (topProfileImage) {

                if (data.profile_pic) {

                    topProfileImage.src =
                        data.profile_pic;

                } else {

                    topProfileImage.src =
                        "https://i.pravatar.cc/150?img=32";
                }


                topProfileImage.onerror =
                    function () {

                        this.src =
                            "https://i.pravatar.cc/150?img=32";

                    };

            }


            /* =====================================
               SHOW ACCOUNT DETAILS
            ===================================== */

            showAccountDetails({

                firstName,
                lastName,
                email,
                phone,
                gender,
                dob,
                address,
                about

            });


        } catch (error) {

            console.error(
                "Student profile error:",
                error
            );

            showAccountError(
                "Backend server-এর সাথে connection হচ্ছে না."
            );

        }

    }


    /* =========================================
       SHOW ACCOUNT DETAILS
    ========================================= */

    function showAccountDetails(profile) {

        if (!contentBody) {
            return;
        }


        contentBody.innerHTML = `

            <div class="settings-page">

                <div class="settings-header">

                    <h2>Settings</h2>

                    <p>
                        Manage your account and profile settings.
                    </p>

                </div>


                <div class="account-details-card">

                    <h3>Account Details</h3>


                    <div class="account-details">


                        <!-- FIRST NAME -->

                        <div class="detail-box">

                            <span>First Name</span>

                            <strong>
                                ${escapeHTML(profile.firstName)}
                            </strong>

                        </div>


                        <!-- LAST NAME -->

                        <div class="detail-box">

                            <span>Last Name</span>

                            <strong>
                                ${escapeHTML(profile.lastName)}
                            </strong>

                        </div>


                        <!-- EMAIL -->

                        <div class="detail-box">

                            <span>Email</span>

                            <strong>
                                ${escapeHTML(profile.email)}
                            </strong>

                        </div>


                        <!-- PHONE -->

                        <div class="detail-box">

                            <span>Phone</span>

                            <strong>
                                ${escapeHTML(profile.phone)}
                            </strong>

                        </div>


                        <!-- GENDER -->

                        <div class="detail-box">

                            <span>Gender</span>

                            <strong>
                                ${escapeHTML(profile.gender)}
                            </strong>

                        </div>


                        <!-- DATE OF BIRTH -->

                        <div class="detail-box">

                            <span>Date of Birth</span>

                            <strong>
                                ${escapeHTML(profile.dob)}
                            </strong>

                        </div>


                        <!-- ADDRESS -->

                        <div class="detail-box">

                            <span>Address</span>

                            <strong>
                                ${escapeHTML(profile.address)}
                            </strong>

                        </div>


                        <!-- ABOUT -->

                        <div class="detail-box">

                            <span>About Me</span>

                            <strong>
                                ${escapeHTML(profile.about)}
                            </strong>

                        </div>


                    </div>


                    <!-- UPDATE PROFILE -->

                    <div class="update-profile-wrapper">

                        <button
                            type="button"
                            class="update-profile-option"
                            id="openUpdateProfile">

                            Update Profile

                            <i class="fa-solid fa-arrow-right"></i>

                        </button>

                    </div>


                </div>

            </div>

        `;


        /* =====================================
           UPDATE PROFILE BUTTON
        ===================================== */

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


    /* =========================================
       ACCOUNT ERROR
    ========================================= */

    function showAccountError(message) {

        if (!contentBody) {
            return;
        }


        contentBody.innerHTML = `

            <div class="settings-page">

                <div class="settings-header">

                    <h2>Settings</h2>

                    <p>
                        Manage your account and profile settings.
                    </p>

                </div>


                <div class="account-details-card">

                    <h3>Account Details</h3>

                    <p>
                        ${escapeHTML(message)}
                    </p>

                </div>

            </div>

        `;

    }


    /* =========================================
       COURSES / SETTINGS / LOGOUT
    ========================================= */

    navItems.forEach(function (item) {

        item.addEventListener(
            "click",
            function (event) {

                const text =
                    item.textContent
                        .trim()
                        .toLowerCase();


                /* =============================
                   COURSES
                ============================= */

                if (text === "courses") {

                    event.preventDefault();


                    navItems.forEach(
                        function (nav) {

                            nav.classList.remove(
                                "active"
                            );

                        }
                    );


                    item.classList.add(
                        "active"
                    );


                    window.location.href =
                        "student.html";


                    return;
                }


                /* =============================
                   SETTINGS
                ============================= */

                if (text === "settings") {

                    event.preventDefault();


                    navItems.forEach(
                        function (nav) {

                            nav.classList.remove(
                                "active"
                            );

                        }
                    );


                    item.classList.add(
                        "active"
                    );


                    loadStudentProfile();


                    return;
                }


                /* =============================
                   LOGOUT
                ============================= */

                if (
                    text === "logout" ||
                    item.classList.contains("logout")
                ) {

                    event.preventDefault();

                    logout();

                    return;
                }

            }
        );

    });


    /* =========================================
       VIDEO / PDF SWITCH
    ========================================= */

    window.switchMedia = function (type) {

        const videoBox =
            document.getElementById(
                "videoPlayerBox"
            );

        const pdfBox =
            document.getElementById(
                "pdfReaderBox"
            );

        const btns =
            document.querySelectorAll(
                ".toggle-btn"
            );


        btns.forEach(function (btn) {

            btn.classList.remove(
                "active"
            );

        });


        if (type === "video") {

            if (videoBox) {

                videoBox.classList.remove(
                    "hidden"
                );

            }

            if (pdfBox) {

                pdfBox.classList.add(
                    "hidden"
                );

            }

            if (btns[0]) {

                btns[0].classList.add(
                    "active"
                );

            }

        } else {

            if (pdfBox) {

                pdfBox.classList.remove(
                    "hidden"
                );

            }

            if (videoBox) {

                videoBox.classList.add(
                    "hidden"
                );

            }

            if (btns[1]) {

                btns[1].classList.add(
                    "active"
                );

            }

        }

    };


    /* =========================================
       OVERVIEW / REVIEWS SWITCH
    ========================================= */

    window.switchTab = function (tabName) {

        const overviewTab =
            document.getElementById(
                "overviewTab"
            );

        const reviewsTab =
            document.getElementById(
                "reviewsTab"
            );

        const btns =
            document.querySelectorAll(
                ".tabs-header .tab-btn"
            );


        btns.forEach(function (btn) {

            btn.classList.remove(
                "active"
            );

        });


        if (tabName === "overview") {

            if (overviewTab) {

                overviewTab.classList.remove(
                    "hidden"
                );

            }

            if (reviewsTab) {

                reviewsTab.classList.add(
                    "hidden"
                );

            }

            if (btns[0]) {

                btns[0].classList.add(
                    "active"
                );

            }

        } else {

            if (reviewsTab) {

                reviewsTab.classList.remove(
                    "hidden"
                );

            }

            if (overviewTab) {

                overviewTab.classList.add(
                    "hidden"
                );

            }

            if (btns[1]) {

                btns[1].classList.add(
                    "active"
                );

            }

        }

    };


    /* =========================================
       LOGOUT FUNCTION
    ========================================= */

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


    /* =========================================
       HTML SECURITY
    ========================================= */

    function escapeHTML(value) {

        return String(value)

            .replace(
                /&/g,
                "&amp;"
            )

            .replace(
                /</g,
                "&lt;"
            )

            .replace(
                />/g,
                "&gt;"
            )

            .replace(
                /"/g,
                "&quot;"
            )

            .replace(
                /'/g,
                "&#039;"
            );

    }


    /* =========================================
       PAGE LOADED
    ========================================= */

    console.log(
        "Course View Details JS Loaded"
    );

});