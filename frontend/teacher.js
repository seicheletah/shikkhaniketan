document.addEventListener('DOMContentLoaded', () => {

    // ==============================
    // API CONFIGURATION
    // ==============================

    const API_BASE_URL = 'http://127.0.0.1:8000/api/v1';

    const DEFAULT_PROFILE_IMAGE =
        'https://i.pravatar.cc/150?img=12';


    // ==============================
    // ELEMENTS
    // ==============================

    const navItems =
        document.querySelectorAll('.nav-item');

    const pageSections =
        document.querySelectorAll('.page-section');

    const menuToggle =
        document.getElementById('menuToggle');

    const sidebar =
        document.getElementById('sidebar');

    const sidebarOverlay =
        document.getElementById('sidebarOverlay');


    // ==============================
    // PAGE NAVIGATION
    // ==============================

    navItems.forEach(item => {

        item.addEventListener('click', async (e) => {

            e.preventDefault();

            const targetPage =
                item.getAttribute('data-page');

            if (!targetPage) return;


            // ==============================
            // LOGOUT
            // ==============================

            if (targetPage === 'logout') {

                logout();

                return;
            }


            // Remove active class
            navItems.forEach(nav => {
                nav.classList.remove('active');
            });


            // Hide all sections
            pageSections.forEach(section => {
                section.classList.remove('active');
            });


            // Add active class
            item.classList.add('active');


            // Show selected section
            const targetSection =
                document.getElementById(targetPage);

            if (targetSection) {
                targetSection.classList.add('active');
            }


            // ==============================
            // PROFILE
            // ==============================

            if (targetPage === 'profile') {

                await getTeacherProfile();

            }


            // ==============================
            // MY COURSES
            // ==============================

            if (targetPage === 'my-courses') {

                await getTeacherCourses();

            }


            closeMobileSidebar();

        });

    });


    // ==============================
    // MOBILE SIDEBAR
    // ==============================

    if (menuToggle) {

        menuToggle.addEventListener('click', () => {

            if (sidebar) {
                sidebar.classList.toggle('open');
            }

            if (sidebarOverlay) {
                sidebarOverlay.classList.toggle('active');
            }

        });

    }


    if (sidebarOverlay) {

        sidebarOverlay.addEventListener(
            'click',
            closeMobileSidebar
        );

    }


    function closeMobileSidebar() {

        if (sidebar) {
            sidebar.classList.remove('open');
        }

        if (sidebarOverlay) {
            sidebarOverlay.classList.remove('active');
        }

    }


    // ==============================
    // GET TEACHER PROFILE
    // GET /teachers/me
    // ==============================

    async function getTeacherProfile() {

        const token =
            localStorage.getItem('access_token');


        if (!token) {

            alert('Please login first.');

            window.location.href =
                'login.html';

            return;
        }


        try {

            console.log(
                'Calling Teacher Profile API...'
            );


            const response =
                await fetch(
                    `${API_BASE_URL}/teachers/me`,
                    {
                        method: 'GET',

                        headers: {
                            'Authorization':
                                `Bearer ${token}`,

                            'Accept':
                                'application/json'
                        }
                    }
                );


            const data =
                await response.json();


            console.log(
                'Teacher Profile API Status:',
                response.status
            );


            console.log(
                'Teacher Profile API Response:',
                data
            );


            // ==============================
            // SUCCESS
            // ==============================

            if (response.ok) {

                console.log(
                    'Teacher profile loaded successfully.'
                );


                displayTeacherProfile(data);

                return;
            }


            // ==============================
            // UNAUTHORIZED
            // ==============================

            if (response.status === 401) {

                alert(
                    'Login expired or unauthorized. Please login again.'
                );


                localStorage.removeItem(
                    'access_token'
                );

                localStorage.removeItem(
                    'token_type'
                );


                window.location.href =
                    'login.html';

                return;
            }


            // ==============================
            // OTHER ERROR
            // ==============================

            console.error(
                'Teacher Profile API Error:',
                data
            );


            alert(
                data.detail ||
                'Teacher profile is not found.'
            );

        }

        catch (error) {

            console.error(
                'Teacher Profile Error:',
                error
            );


            alert(
                'Backend server-এর সাথে connection হচ্ছে না!'
            );

        }

    }


    // ==============================
    // DISPLAY TEACHER PROFILE
    // ==============================

    function displayTeacherProfile(data) {

        // ==============================
        // BASIC INFORMATION
        // ==============================

        const firstName =
            data.first_name || '';

        const lastName =
            data.last_name || '';


        // ==============================
        // WELCOME NAME
        // ==============================

        const welcomeNameElement =
            document.getElementById(
                'teacherWelcomeName'
            );


        if (welcomeNameElement) {

            if (firstName || lastName) {

                welcomeNameElement.textContent =
                    `Welcome, ${firstName} ${lastName}`.trim();

            }

            else {

                welcomeNameElement.textContent =
                    'Welcome';

            }

        }


        // ==============================
        // WELCOME ABOUT
        // ==============================

        const welcomeAboutElement =
            document.getElementById(
                'teacherWelcomeAbout'
            );


        if (welcomeAboutElement) {

            welcomeAboutElement.textContent =
                data.about || '';

        }


        // ==============================
        // HEADER PROFILE PICTURE
        // ==============================

        const profileImgElement =
            document.getElementById(
                'teacherProfileImg'
            );


        if (profileImgElement) {

            const profilePic =
                data.profile_pic;


            console.log(
                'Teacher Profile Picture:',
                profilePic
            );


            if (profilePic) {

                let photoUrl =
                    profilePic;


                if (
                    profilePic.startsWith('http://') ||
                    profilePic.startsWith('https://')
                ) {

                    photoUrl =
                        profilePic;

                }

                else {

                    photoUrl =
                        `${API_BASE_URL}${profilePic.startsWith('/') ? '' : '/'}${profilePic}`;

                }


                profileImgElement.src =
                    photoUrl;

            }

            else {

                profileImgElement.src =
                    DEFAULT_PROFILE_IMAGE;

            }


            profileImgElement.onerror = () => {

                console.error(
                    'Teacher profile image could not be loaded.'
                );


                profileImgElement.src =
                    DEFAULT_PROFILE_IMAGE;

            };

        }


        // ==============================
        // PROFILE SECTION
        // ==============================

        const profileSection =
            document.getElementById('profile');


        if (!profileSection) {

            console.error(
                'Teacher profile section not found!'
            );

            return;
        }


        // ==============================
        // EMAIL
        // ==============================

        const email =
            data.user?.email_id ||
            'Not available';


        // ==============================
        // TEACHER ID
        // ==============================

        const teacherId =
            data.user?.id ||
            'Not available';


        // ==============================
        // PROFILE IMAGE
        // ==============================

        const profilePic =
            data.profile_pic ||
            DEFAULT_PROFILE_IMAGE;


        let profileImageUrl =
            profilePic;


        if (
            profilePic &&
            !profilePic.startsWith('http://') &&
            !profilePic.startsWith('https://')
        ) {

            profileImageUrl =
                `${API_BASE_URL}${profilePic.startsWith('/') ? '' : '/'}${profilePic}`;

        }


        console.log(
            'Teacher Profile Page Image URL:',
            profileImageUrl
        );


        // ==============================
        // PROFILE HTML
        // ==============================

        profileSection.innerHTML = `

            <div class="profile-card">

                <div class="profile-header">

                    <img
                        src="${profileImageUrl}"
                        alt="Teacher Profile"
                        class="profile-page-image"
                    >

                    <div class="profile-title">

                        <h2>
                            Teacher Profile
                        </h2>

                        <p>
                            ${firstName} ${lastName}
                        </p>

                    </div>

                </div>


                <div class="profile-info">

                    <p>
                        <strong>Teacher ID:</strong>
                        <span>${teacherId}</span>
                    </p>


                    <p>
                        <strong>Name:</strong>
                        <span>${firstName} ${lastName}</span>
                    </p>


                    <p>
                        <strong>Email:</strong>
                        <span>${email}</span>
                    </p>


                    <p>
                        <strong>Phone:</strong>
                        <span>
                            ${data.phone_no || 'Not provided'}
                        </span>
                    </p>


                    <p>
                        <strong>Gender:</strong>
                        <span>
                            ${data.gender || 'Not provided'}
                        </span>
                    </p>


                    <p>
                        <strong>Date of Birth:</strong>
                        <span>
                            ${data.date_of_birth || 'Not provided'}
                        </span>
                    </p>


                    <p>
                        <strong>Address:</strong>
                        <span>
                            ${data.address || 'Not provided'}
                        </span>
                    </p>


                    <p>
                        <strong>About:</strong>
                        <span>
                            ${data.about || 'Not provided'}
                        </span>
                    </p>

                </div>


                <button
                    type="button"
                    class="update-btn"
                    id="teacherUpdateProfileBtn"
                >
                    Update Profile
                </button>

            </div>

        `;


        // ==============================
        // PROFILE PAGE IMAGE ERROR
        // ==============================

        const profilePageImage =
            profileSection.querySelector(
                '.profile-page-image'
            );


        if (profilePageImage) {

            profilePageImage.onerror = () => {

                console.error(
                    'Teacher profile page image failed to load:',
                    profilePageImage.src
                );


                profilePageImage.src =
                    DEFAULT_PROFILE_IMAGE;

            };


            profilePageImage.onload = () => {

                console.log(
                    'Teacher profile page image loaded successfully.'
                );

            };

        }


        // ==============================
        // UPDATE PROFILE BUTTON
        // ==============================

        const updateProfileBtn =
            document.getElementById(
                'teacherUpdateProfileBtn'
            );


        if (updateProfileBtn) {

            updateProfileBtn.addEventListener(
                'click',
                () => {

                    window.location.href =
                        'update_profile.html';

                }
            );

        }

    }


    // ==============================
    // GET TEACHER COURSES
    // GET /teachers/me/courses
    // ==============================

    async function getTeacherCourses() {

        const token =
            localStorage.getItem(
                'access_token'
            );


        if (!token) {

            alert('Please login first.');

            window.location.href =
                'login.html';

            return;
        }


        try {

            const response =
                await fetch(
                    `${API_BASE_URL}/teachers/me/courses`,
                    {
                        method: 'GET',

                        headers: {
                            'Authorization':
                                `Bearer ${token}`,

                            'Accept':
                                'application/json'
                        }
                    }
                );


            const data =
                await response.json();


            console.log(
                'Teacher Courses API Response:',
                data
            );


            if (!response.ok) {

                console.error(
                    'Teacher Courses API Error:',
                    data
                );


                if (response.status === 401) {

                    alert(
                        'Login expired or unauthorized.'
                    );


                    localStorage.removeItem(
                        'access_token'
                    );

                    localStorage.removeItem(
                        'token_type'
                    );


                    window.location.href =
                        'login.html';

                }

                else {

                    alert(
                        data.detail ||
                        'Courses পাওয়া যাচ্ছে না.'
                    );

                }

                return;
            }


            displayTeacherCourses(data);

        }

        catch (error) {

            console.error(
                'Teacher Courses Error:',
                error
            );


            alert(
                'Backend server-এর সাথে connection হচ্ছে না!'
            );

        }

    }


    // ==============================
    // DISPLAY TEACHER COURSES
    // ==============================

    function displayTeacherCourses(courses) {

        const courseSection =
            document.getElementById(
                'my-courses'
            );


        if (!courseSection) return;


        if (
            !Array.isArray(courses) ||
            courses.length === 0
        ) {

            courseSection.innerHTML = `

                <h2>
                    My Courses
                </h2>

                <p>
                    No courses found.
                </p>

            `;

            return;
        }


        let coursesHTML = `

            <h2>
                My Courses
            </h2>

            <div class="course-grid">

        `;


        courses.forEach(course => {

            coursesHTML += `

                <div class="course-card">

                    <div class="course-icon">

                        <i class="fa-solid fa-book"></i>

                    </div>


                    <h4>
                        ${course.course_name || 'Course'}
                    </h4>


                    <p>
                        ${course.course_details || 'No details available'}
                    </p>


                    <p>

                        <strong>
                            Language:
                        </strong>

                        ${course.course_language || 'Not provided'}

                    </p>


                    <p>

                        <strong>
                            Price:
                        </strong>

                        ${
                            course.course_paid
                                ? `${course.course_price || 0} ${course.course_price_currency || 'INR'}`
                                : 'Free'
                        }

                    </p>

                </div>

            `;

        });


        coursesHTML += `

            </div>

        `;


        courseSection.innerHTML =
            coursesHTML;

    }


    // ==============================
    // LOGOUT
    // ==============================

    function logout() {

        localStorage.removeItem(
            'access_token'
        );

        localStorage.removeItem(
            'token_type'
        );


        alert(
            'Logged out successfully!'
        );


        window.location.href =
            'login.html';

    }


    // ==============================
    // INITIAL TOKEN CHECK
    // ==============================

    const token =
        localStorage.getItem(
            'access_token'
        );


    if (token) {

        console.log(
            'Teacher page: Access token found.'
        );


        getTeacherProfile();

    }

    else {

        console.warn(
            'Teacher page: No access token found.'
        );

    }

});