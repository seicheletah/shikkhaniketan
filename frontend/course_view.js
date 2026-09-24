// ========================================
// COURSE VIEW JS
// ========================================

document.addEventListener("DOMContentLoaded", function () {

    const API_BASE_URL =
        "http://127.0.0.1:8000/api/v1";

    const token =
        localStorage.getItem("access_token");

    const userRole =
        localStorage.getItem("userRole");


    // ========================================
    // LOGIN CHECK
    // ========================================

    if (!token) {

        window.location.href = "login.html";

        return;
    }


    // ========================================
    // ELEMENTS
    // ========================================

    const contentBody =
        document.querySelector(".content-body");

    const navItems =
        document.querySelectorAll(".nav-item");


    // ========================================
    // SIDEBAR NAVIGATION
    // ========================================

    navItems.forEach(function (item) {

        item.addEventListener("click", function (event) {

            event.preventDefault();

            const text =
                item.textContent.trim().toLowerCase();


            // ====================================
            // COURSES
            // ====================================

            if (text === "courses") {

                navItems.forEach(function (nav) {
                    nav.classList.remove("active");
                });

                item.classList.add("active");

                window.location.href =
                    "course_view.html";

                return;
            }


            // ====================================
            // SETTINGS
            // ====================================

            if (text === "settings") {

                navItems.forEach(function (nav) {
                    nav.classList.remove("active");
                });

                item.classList.add("active");

                loadAccountDetails();

                return;
            }


            // ====================================
            // LOGOUT
            // ====================================

            if (
                text === "logout" ||
                item.classList.contains("logout")
            ) {

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

        });

    });


    // ========================================
    // LOAD ACCOUNT DETAILS
    // ========================================

    async function loadAccountDetails() {

        if (!contentBody) {
            return;
        }


        // ====================================
        // API ENDPOINT
        // ====================================

        let profileEndpoint = "";

        if (userRole === "teacher") {

            profileEndpoint =
                `${API_BASE_URL}/teachers/me`;

        } else {

            profileEndpoint =
                `${API_BASE_URL}/students/me`;

        }


        try {

            console.log(
                "Loading account details..."
            );


            const response =
                await fetch(
                    profileEndpoint,
                    {
                        method: "GET",

                        headers: {
                            "Authorization":
                                `Bearer ${token}`,

                            "Accept":
                                "application/json"
                        }
                    }
                );


            console.log(
                "Account API Status:",
                response.status
            );


            // ====================================
            // SESSION EXPIRED
            // ====================================

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
                "Account Data:",
                data
            );


            if (!response.ok) {

                showAccountError(
                    "Unable to load account details."
                );

                return;
            }


            // ====================================
            // GET PROFILE VALUES
            // ====================================

            const firstName =
                data.first_name ||
                "Not provided";


            const lastName =
                data.last_name ||
                "Not provided";


            const email =
                data.user?.email_id ||
                data.email_id ||
                data.email ||
                "Not provided";


            const phone =
                data.phone_no ||
                "Not provided";


            const gender =
                data.gender ||
                "Not provided";


            let dob =
                data.date_of_birth ||
                "Not provided";


            if (
                typeof dob === "string" &&
                dob.includes("T")
            ) {

                dob =
                    dob.split("T")[0];

            }


            const address =
                data.address ||
                "Not provided";


            const about =
                data.about ||
                "Not provided";


            // ====================================
            // UPDATE TOP USER NAME
            // ====================================

            const userName =
                document.querySelector(
                    ".user-name"
                );


            if (userName) {

                userName.textContent =
                    `${firstName} ${lastName}`.trim();

            }


            // ====================================
            // SHOW SETTINGS
            // ====================================

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
                "Account Details Error:",
                error
            );


            showAccountError(
                "Backend server-এর সাথে connection হচ্ছে না."
            );

        }

    }


    // ========================================
    // SHOW ACCOUNT DETAILS
    // ========================================

    function showAccountDetails(profile) {

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


                        <div class="detail-row">

                            <span>
                                First Name
                            </span>

                            <strong>
                                ${escapeHTML(
                                    profile.firstName
                                )}
                            </strong>

                        </div>


                        <div class="detail-row">

                            <span>
                                Last Name
                            </span>

                            <strong>
                                ${escapeHTML(
                                    profile.lastName
                                )}
                            </strong>

                        </div>


                        <div class="detail-row">

                            <span>
                                Email
                            </span>

                            <strong>
                                ${escapeHTML(
                                    profile.email
                                )}
                            </strong>

                        </div>


                        <div class="detail-row">

                            <span>
                                Phone
                            </span>

                            <strong>
                                ${escapeHTML(
                                    profile.phone
                                )}
                            </strong>

                        </div>


                        <div class="detail-row">

                            <span>
                                Gender
                            </span>

                            <strong>
                                ${escapeHTML(
                                    profile.gender
                                )}
                            </strong>

                        </div>


                        <div class="detail-row">

                            <span>
                                Date of Birth
                            </span>

                            <strong>
                                ${escapeHTML(
                                    profile.dob
                                )}
                            </strong>

                        </div>


                        <div class="detail-row">

                            <span>
                                Address
                            </span>

                            <strong>
                                ${escapeHTML(
                                    profile.address
                                )}
                            </strong>

                        </div>


                        <div class="detail-row">

                            <span>
                                About Me
                            </span>

                            <strong>
                                ${escapeHTML(
                                    profile.about
                                )}
                            </strong>

                        </div>


                    </div>


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


        // ====================================
        // UPDATE PROFILE BUTTON
        // ====================================

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


    // ========================================
    // ACCOUNT ERROR
    // ========================================

    function showAccountError(message) {

        contentBody.innerHTML = `

            <div class="settings-page">

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


    // ========================================
    // ESCAPE HTML
    // ========================================

    function escapeHTML(value) {

        return String(value)

            .replace(/&/g, "&amp;")

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

});


// ========================================
// MEDIA SWITCHER
// ========================================

function switchMedia(mediaType) {

    const videoBox =
        document.getElementById(
            "videoPlayerBox"
        );

    const pdfBox =
        document.getElementById(
            "pdfReaderBox"
        );

    const buttons =
        document.querySelectorAll(
            ".media-toggle-bar .toggle-btn"
        );


    buttons.forEach(function (btn) {

        btn.classList.remove(
            "active"
        );

    });


    if (mediaType === "video") {

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

        if (buttons[0]) {
            buttons[0].classList.add(
                "active"
            );
        }

    }


    if (mediaType === "pdf") {

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

        if (buttons[1]) {
            buttons[1].classList.add(
                "active"
            );
        }

    }

}


// ========================================
// OVERVIEW / REVIEWS
// ========================================

function switchTab(tabName) {

    const overviewTab =
        document.getElementById(
            "overviewTab"
        );

    const reviewsTab =
        document.getElementById(
            "reviewsTab"
        );

    const tabButtons =
        document.querySelectorAll(
            ".tabs-header .tab-btn"
        );


    tabButtons.forEach(function (btn) {

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

        if (tabButtons[0]) {

            tabButtons[0].classList.add(
                "active"
            );

        }

    }


    if (tabName === "reviews") {

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

        if (tabButtons[1]) {

            tabButtons[1].classList.add(
                "active"
            );

        }

    }

}