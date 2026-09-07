console.log("🔥 STUDENT JS LOADED - FINAL VERSION");

document.addEventListener("DOMContentLoaded", () => {

    // ==============================
    // API CONFIGURATION
    // ==============================

    const API_BASE_URL = "http://127.0.0.1:8000/api/v1";

    const DEFAULT_PROFILE_IMAGE =
        "https://i.pravatar.cc/150?img=32";


    // ==============================
    // PAGE NAVIGATION
    // ==============================

    const navItems = document.querySelectorAll(".nav-item");
    const pageSections = document.querySelectorAll(".page-section");

    navItems.forEach((item) => {

        item.addEventListener("click", (event) => {

            event.preventDefault();

            const targetPage = item.getAttribute("data-page");

            if (!targetPage) {
                return;
            }


            // ==============================
            // LOGOUT
            // ==============================

            if (targetPage === "logout") {
                logout();
                return;
            }


            // ==============================
            // REMOVE ACTIVE FROM NAV
            // ==============================

            navItems.forEach((nav) => {
                nav.classList.remove("active");
            });


            // ==============================
            // HIDE ALL SECTIONS
            // ==============================

            pageSections.forEach((section) => {
                section.classList.remove("active");
            });


            // ==============================
            // ACTIVE NAV ITEM
            // ==============================

            item.classList.add("active");


            // ==============================
            // SHOW SELECTED SECTION
            // ==============================

            const targetSection =
                document.getElementById(targetPage);

            if (targetSection) {
                targetSection.classList.add("active");
            }


            // ==============================
            // LOAD PROFILE
            // ==============================

            if (targetPage === "profile") {
                getStudentProfile();
            }


            closeMobileSidebar();

        });

    });


    // ==============================
    // MOBILE SIDEBAR
    // ==============================

    const menuToggle =
        document.getElementById("menuToggle");

    const sidebar =
        document.getElementById("sidebar");

    const sidebarOverlay =
        document.getElementById("sidebarOverlay");


    if (menuToggle) {

        menuToggle.addEventListener("click", () => {

            if (sidebar) {
                sidebar.classList.toggle("open");
            }

            if (sidebarOverlay) {
                sidebarOverlay.classList.toggle("active");
            }

        });

    }


    if (sidebarOverlay) {

        sidebarOverlay.addEventListener(
            "click",
            closeMobileSidebar
        );

    }


    function closeMobileSidebar() {

        if (sidebar) {
            sidebar.classList.remove("open");
        }

        if (sidebarOverlay) {
            sidebarOverlay.classList.remove("active");
        }

    }


    // ==============================
    // GET STUDENT PROFILE
    // GET /students/me
    // ==============================

    async function getStudentProfile() {

        const token =
            localStorage.getItem("access_token");


        // ==============================
        // TOKEN CHECK
        // ==============================

        if (!token) {

            alert("Please login first.");

            window.location.href = "login.html";

            return;
        }


        try {

            console.log("Calling Student API...");


            const response = await fetch(
                `${API_BASE_URL}/students/me`,
                {
                    method: "GET",

                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Accept": "application/json"
                    }
                }
            );


            const data =
                await response.json();


            console.log(
                "Student API Status:",
                response.status
            );


            console.log(
                "Student API Response:",
                data
            );


            // ==============================
            // SUCCESS
            // ==============================

            if (response.ok) {

                console.log(
                    "Student details loaded successfully"
                );


                // Header profile picture
                displayStudentProfilePicture(data);


                // Profile page
                displayStudentProfile(data);


                return;
            }


            // ==============================
            // UNAUTHORIZED
            // ==============================

            if (response.status === 401) {

                alert(
                    "Login expired. Please login again."
                );


                localStorage.removeItem(
                    "access_token"
                );

                localStorage.removeItem(
                    "token_type"
                );


                window.location.href =
                    "login.html";

                return;
            }


            // ==============================
            // OTHER ERROR
            // ==============================

            console.error(
                "Student API Error:",
                data
            );


            alert(
                data.detail ||
                "Unable to load student details."
            );

        }

        catch (error) {

            console.error(
                "Fetch Error:",
                error
            );


            alert(
                "Backend server-এর সাথে connection হচ্ছে না!"
            );

        }

    }


    // ==============================
    // DISPLAY HEADER PROFILE PICTURE
    // ==============================

    function displayStudentProfilePicture(data) {

        const profileImage =
            document.getElementById(
                "studentProfileImg"
            );


        if (!profileImage) {

            console.error(
                "studentProfileImg element not found!"
            );

            return;
        }


        const profilePic =
            data.profile_pic;


        console.log(
            "Profile pic from API:",
            profilePic
        );


        if (profilePic) {

            profileImage.src =
                profilePic;

        }

        else {

            profileImage.src =
                DEFAULT_PROFILE_IMAGE;

        }


        // ==============================
        // IMAGE ERROR
        // ==============================

        profileImage.onerror = () => {

            console.error(
                "Profile image failed to load:",
                profileImage.src
            );


            profileImage.src =
                DEFAULT_PROFILE_IMAGE;

        };


        // ==============================
        // IMAGE SUCCESS
        // ==============================

        profileImage.onload = () => {

            console.log(
                "Student profile picture loaded successfully."
            );

        };

    }


    // ==============================
    // DISPLAY STUDENT PROFILE
    // ==============================

    function displayStudentProfile(data) {

        const profileSection =
            document.getElementById("profile");


        if (!profileSection) {

            console.error(
                "Profile section not found!"
            );

            return;
        }


        // ==============================
        // BASIC INFORMATION
        // ==============================

        const firstName =
            data.first_name || "";

        const lastName =
            data.last_name || "";

        const email =
            data.user?.email_id || "";

        const userId =
            data.user?.id || "Not available";

        const phone =
            data.phone_no || "Not provided";

        const gender =
            data.gender || "Not provided";

        const dateOfBirth =
            data.date_of_birth || "Not provided";

        const address =
            data.address || "Not provided";

        const about =
            data.about || "Not provided";


        // ==============================
        // PROFILE PICTURE
        // ==============================

        const profilePic =
            data.profile_pic ||
            DEFAULT_PROFILE_IMAGE;


        console.log(
            "Profile Page Image URL:",
            profilePic
        );


        // ==============================
        // PROFILE HTML
        // ==============================

        profileSection.innerHTML = `

            <div class="profile-card">

                <div class="profile-header">

                    <img
                        src="${profilePic}"
                        alt="Student Profile"
                        class="profile-page-image"
                    >

                    <div class="profile-title">

                        <h2>
                            Student Profile
                        </h2>

                        <p>
                            ${firstName} ${lastName}
                        </p>

                    </div>

                </div>


                <div class="profile-info">

                    <p>
                        <strong>User ID:</strong>
                        ${userId}
                    </p>

                    <p>
                        <strong>Name:</strong>
                        ${firstName} ${lastName}
                    </p>

                    <p>
                        <strong>Email:</strong>
                        ${email}
                    </p>

                    <p>
                        <strong>Phone:</strong>
                        ${phone}
                    </p>

                    <p>
                        <strong>Gender:</strong>
                        ${gender}
                    </p>

                    <p>
                        <strong>Date of Birth:</strong>
                        ${dateOfBirth}
                    </p>

                    <p>
                        <strong>Address:</strong>
                        ${address}
                    </p>

                    <p>
                        <strong>About:</strong>
                        ${about}
                    </p>

                </div>


                <button
                    type="button"
                    class="update-btn"
                    id="studentUpdateProfileBtn"
                >
                    Update Profile
                </button>

            </div>

        `;


        // ==============================
        // PROFILE PAGE IMAGE
        // ==============================

        const profilePageImage =
            profileSection.querySelector(
                ".profile-page-image"
            );


        if (profilePageImage) {

            profilePageImage.onerror = () => {

                console.error(
                    "Profile page image failed to load:",
                    profilePageImage.src
                );


                profilePageImage.src =
                    DEFAULT_PROFILE_IMAGE;

            };


            profilePageImage.onload = () => {

                console.log(
                    "Profile page image loaded successfully."
                );

            };

        }


        // ==============================
        // UPDATE PROFILE BUTTON
        // ==============================

        const updateProfileBtn =
            document.getElementById(
                "studentUpdateProfileBtn"
            );


        if (updateProfileBtn) {

            updateProfileBtn.addEventListener(
                "click",
                () => {

                    window.location.href =
                        "update_profile.html";

                }
            );

        }

    }


    // ==============================
    // LOGOUT
    // ==============================

    function logout() {

        localStorage.removeItem(
            "access_token"
        );

        localStorage.removeItem(
            "token_type"
        );


        alert(
            "Logged out successfully!"
        );


        window.location.href =
            "login.html";

    }


    // ==============================
    // LOAD PROFILE ON PAGE LOAD
    // ==============================

    const token =
        localStorage.getItem(
            "access_token"
        );


    if (token) {

        console.log(
            "Student page: Access token found."
        );


        getStudentProfile();

    }

    else {

        console.warn(
            "Student page: No access token found."
        );

    }

});