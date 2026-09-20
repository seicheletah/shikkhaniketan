document.addEventListener("DOMContentLoaded", function () {

    /* =====================================================
       API & TOKEN
    ===================================================== */

    const API_URL = "http://127.0.0.1:8000/api/v1/teachers/me";

    const token = localStorage.getItem("access_token");


    /* =====================================================
       ELEMENTS
    ===================================================== */

    const navItems = document.querySelectorAll(".nav-item");

    const sections = document.querySelectorAll(".page-section");

    const profileImage =
        document.getElementById("teacherProfileImg");

    const userName =
        document.getElementById("teacherUserName");


    /* =====================================================
       TOKEN CHECK
    ===================================================== */

    if (!token) {

        window.location.href = "login.html";

        return;

    }


    /* =====================================================
       SIDEBAR NAVIGATION
    ===================================================== */

    navItems.forEach(function (item) {

        item.addEventListener("click", function (event) {

            event.preventDefault();

            const page =
                item.getAttribute("data-page");


            /* ---------------- COURSES ---------------- */

            if (page === "courses") {

                showSection("courses");

                return;

            }


            /* ---------------- SETTINGS ---------------- */

            if (page === "settings") {

                showSection("settings");

                loadTeacherProfile();

                return;

            }


            /* ---------------- LOGOUT ---------------- */

            if (page === "logout") {

                logout();

                return;

            }

        });

    });


    /* =====================================================
       SHOW SECTION
    ===================================================== */

    function showSection(page) {

        /* Remove active from all nav items */

        navItems.forEach(function (nav) {

            nav.classList.remove("active");

        });


        /* Hide all sections */

        sections.forEach(function (section) {

            section.classList.remove("active");

        });


        /* Active navigation */

        const selectedNav =
            document.querySelector(
                '.nav-item[data-page="' + page + '"]'
            );


        if (selectedNav) {

            selectedNav.classList.add("active");

        }


        /* Show selected section */

        const selectedSection =
            document.getElementById(page);


        if (selectedSection) {

            selectedSection.classList.add("active");

        }

    }


    /* =====================================================
       LOAD TEACHER PROFILE
    ===================================================== */

    async function loadTeacherProfile() {

        const accountDetails =
            document.getElementById("accountDetails");


        if (!accountDetails) {

            console.error(
                "accountDetails element not found."
            );

            return;

        }


        /* Loading */

        accountDetails.innerHTML = `

            <div class="settings-page">

                <div class="settings-header">

                    <h2>
                        Account Settings
                    </h2>

                    <p>
                        Your account information
                    </p>

                </div>


                <div class="account-details-card">

                    <h3>
                        Account Details
                    </h3>

                    <p>
                        Loading profile information...
                    </p>

                </div>

            </div>

        `;


        try {

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


            /* =================================================
               UNAUTHORIZED
            ================================================= */

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


            /* =================================================
               RESPONSE
            ================================================= */

            const data =
                await response.json();


            console.log(
                "Teacher profile API response:",
                data
            );


            if (!response.ok) {

                showAccountError(
                    "Unable to load account details."
                );

                return;

            }


            /* =================================================
               PROFILE DATA
            ================================================= */

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


            /* =================================================
               TOP BAR NAME
            ================================================= */

            if (userName) {

                const fullName =
                    `${firstName} ${lastName}`.trim();


                userName.textContent =
                    fullName || "Teacher";

            }


            /* =================================================
               PROFILE IMAGE
            ================================================= */

            if (profileImage) {

                if (data.profile_pic) {

                    profileImage.src =
                        data.profile_pic;

                } else {

                    profileImage.src =
                        "https://i.pravatar.cc/150?img=47";

                }


                profileImage.onerror =
                    function () {

                        this.src =
                            "https://i.pravatar.cc/150?img=47";

                    };

            }


            /* =================================================
               DISPLAY ACCOUNT DETAILS
            ================================================= */

            displayTeacherProfile({

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
                "Teacher profile error:",
                error
            );


            showAccountError(
                "Backend server-এর সাথে connection হচ্ছে না."
            );

        }

    }


    /* =====================================================
       DISPLAY TEACHER PROFILE
    ===================================================== */

    function displayTeacherProfile(profile) {

        const accountDetails =
            document.getElementById(
                "accountDetails"
            );


        if (!accountDetails) {

            return;

        }


        accountDetails.innerHTML = `

            <div class="settings-page">


                <!-- HEADER -->

                <div class="settings-header">

                    <h2>
                        Account Settings
                    </h2>

                    <p>
                        Your account information
                    </p>

                </div>



                <!-- ACCOUNT CARD -->

                <div class="account-details-card">


                    <h3>
                        Account Details
                    </h3>



                    <div class="account-details">


                        <!-- FIRST NAME -->

                        <div class="detail-row">

                            <span>
                                First Name
                            </span>

                            <strong>
                                ${escapeHTML(profile.firstName)}
                            </strong>

                        </div>



                        <!-- LAST NAME -->

                        <div class="detail-row">

                            <span>
                                Last Name
                            </span>

                            <strong>
                                ${escapeHTML(profile.lastName)}
                            </strong>

                        </div>



                        <!-- EMAIL -->

                        <div class="detail-row">

                            <span>
                                Email
                            </span>

                            <strong>
                                ${escapeHTML(profile.email)}
                            </strong>

                        </div>



                        <!-- PHONE -->

                        <div class="detail-row">

                            <span>
                                Phone
                            </span>

                            <strong>
                                ${escapeHTML(profile.phone)}
                            </strong>

                        </div>



                        <!-- GENDER -->

                        <div class="detail-row">

                            <span>
                                Gender
                            </span>

                            <strong>
                                ${escapeHTML(profile.gender)}
                            </strong>

                        </div>



                        <!-- DOB -->

                        <div class="detail-row">

                            <span>
                                Date of Birth
                            </span>

                            <strong>
                                ${escapeHTML(profile.dob)}
                            </strong>

                        </div>



                        <!-- ADDRESS -->

                        <div class="detail-row">

                            <span>
                                Address
                            </span>

                            <strong>
                                ${escapeHTML(profile.address)}
                            </strong>

                        </div>



                        <!-- ABOUT -->

                        <div class="detail-row">

                            <span>
                                About Me
                            </span>

                            <strong>
                                ${escapeHTML(profile.about)}
                            </strong>

                        </div>


                    </div>



                    <!-- UPDATE PROFILE BUTTON -->

                    <div class="update-profile-wrapper">

                        <button
                            type="button"
                            class="update-profile-option"
                            id="openUpdateProfile"
                        >

                            Update Profile

                            <i class="fa-solid fa-arrow-right"></i>

                        </button>

                    </div>


                </div>

            </div>

        `;


        /* =================================================
           UPDATE PROFILE
        ================================================= */

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


    /* =====================================================
       ACCOUNT ERROR
    ===================================================== */

    function showAccountError(message) {

        const accountDetails =
            document.getElementById(
                "accountDetails"
            );


        if (!accountDetails) {

            return;

        }


        accountDetails.innerHTML = `

            <div class="settings-page">


                <div class="settings-header">

                    <h2>
                        Account Settings
                    </h2>

                    <p>
                        Your account information
                    </p>

                </div>



                <div class="account-details-card">

                    <h3>
                        Account Details
                    </h3>

                    <p>
                        ${escapeHTML(message)}
                    </p>

                </div>


            </div>

        `;

    }


    /* =====================================================
       ESCAPE HTML
    ===================================================== */

    function escapeHTML(value) {

        return String(value)

            .replace(/&/g, "&amp;")

            .replace(/</g, "&lt;")

            .replace(/>/g, "&gt;")

            .replace(/"/g, "&quot;")

            .replace(/'/g, "&#039;");

    }


    /* =====================================================
       LOGOUT
    ===================================================== */

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


    /* =====================================================
       UPDATE FILE NAME
    ===================================================== */

    window.updateFileName =
        function (input, textId) {

            const text =
                document.getElementById(
                    textId
                );


            if (!text) {

                return;

            }


            if (
                input &&
                input.files &&
                input.files.length > 0
            ) {

                text.textContent =
                    input.files[0].name;

            }

        };


    /* =====================================================
       PAID / FREE PRICE FIELD
    ===================================================== */

    window.togglePriceField =
        function (value) {

            const priceGroup =
                document.getElementById(
                    "priceGroup"
                );


            const priceInput =
                document.getElementById(
                    "price"
                );


            if (
                !priceGroup ||
                !priceInput
            ) {

                return;

            }


            if (value === "free") {

                priceGroup.style.display =
                    "none";

                priceInput.value = "";

            }

            else {

                priceGroup.style.display =
                    "flex";

            }

        };


    /* =====================================================
       COURSE FORM
    ===================================================== */

    const courseForm =
        document.getElementById(
            "addCourseForm"
        );


    if (courseForm) {

        courseForm.addEventListener(
            "submit",
            function (event) {

                event.preventDefault();


                const courseName =
                    document.getElementById(
                        "courseName"
                    )?.value.trim();


                const courseDetails =
                    document.getElementById(
                        "courseDetails"
                    )?.value.trim();


                const language =
                    document.getElementById(
                        "language"
                    )?.value;


                const courseType =
                    document.getElementById(
                        "courseType"
                    )?.value;


                /* ================= VALIDATION ================= */

                if (
                    !courseName ||
                    !courseDetails ||
                    !language ||
                    !courseType
                ) {

                    alert(
                        "Please fill all required fields."
                    );

                    return;

                }


                /* ================= TEMP ================= */

                alert(
                    "Course details ready to submit."
                );

            }
        );

    }


    /* =====================================================
       INITIAL PAGE
    ===================================================== */

    showSection("courses");

});