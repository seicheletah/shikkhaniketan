document.addEventListener('DOMContentLoaded', () => {

    // ==============================
    // API CONFIGURATION
    // ==============================

    const API_BASE_URL = 'http://127.0.0.1:8000/api/v1';


    // ==============================
    // ELEMENTS
    // ==============================

    const navItems = document.querySelectorAll('.nav-item');
    const pageSections = document.querySelectorAll('.page-section');

    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');


    // ==============================
    // PAGE NAVIGATION
    // ==============================

    navItems.forEach(item => {

        item.addEventListener('click', async (e) => {

            e.preventDefault();

            const targetPage = item.getAttribute('data-page');

            if (!targetPage) return;


            // Logout
            if (targetPage === 'logout') {

                localStorage.removeItem('access_token');
                localStorage.removeItem('token_type');

                alert('Logged out successfully!');

                window.location.href = 'login.html';

                return;
            }


            // Remove active
            navItems.forEach(nav => {
                nav.classList.remove('active');
            });

            pageSections.forEach(section => {
                section.classList.remove('active');
            });


            // Add active
            item.classList.add('active');


            // Show section
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

            sidebar.classList.toggle('open');
            sidebarOverlay.classList.toggle('active');

        });

    }


    if (sidebarOverlay) {

        sidebarOverlay.addEventListener(
            'click',
            closeMobileSidebar
        );

    }


    function closeMobileSidebar() {

        sidebar.classList.remove('open');
        sidebarOverlay.classList.remove('active');

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

            window.location.href = 'login.html';

            return;
        }


        try {

            const response = await fetch(
                `${API_BASE_URL}/teachers/me`,
                {
                    method: 'GET',

                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json'
                    }
                }
            );


            const data = await response.json();


            console.log(
                'Teacher Profile API Response:',
                data
            );


            if (!response.ok) {

                console.error(
                    'Teacher Profile API Error:',
                    data
                );


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

                    window.location.href = 'login.html';

                } else {

                    alert(
                        data.detail ||
                        'Teacher profile is not found.'
                    );

                }

                return;
            }


            // Display profile
            displayTeacherProfile(data);

        } catch (error) {

            console.error(
                'Teacher Profile Error:',
                error
            );

            alert(
                'Backend server- connection is not found !'
            );

        }

    }


    // ==============================
    // DISPLAY TEACHER PROFILE
    // ==============================

    function displayTeacherProfile(data) {

        const firstName =
            data.first_name || '';

        const lastName =
            data.last_name || '';

        // Header-এর Welcome Name Dynamic করার অংশ
        const welcomeNameElement = document.getElementById('teacherWelcomeName');
        if (welcomeNameElement && firstName) {
            welcomeNameElement.textContent = `Welcome, ${firstName}`;
        }

        // Header-এর About Section Dynamic করার অংশ
        const welcomeAboutElement = document.getElementById('teacherWelcomeAbout');
        if (welcomeAboutElement && data.about) {
            welcomeAboutElement.textContent = data.about;
        }

        const profileSection =
            document.getElementById('profile');


        if (!profileSection) return;


        const email =
            data.user?.email_id || 'Not available';

        const teacherId =
            data.user?.id || 'Not available';


        profileSection.innerHTML = `


            <div class="profile-details">
                
            <h2>Teacher Profile</h2>

                 <p>
                    <strong>Teacher ID:</strong>
                    ${teacherId}
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
                    ${data.phone_no || 'Not provided'}
                </p>

                <p>
                    <strong>Gender:</strong>
                    ${data.gender || 'Not provided'}
                </p>

                <p>
                    <strong>Date of Birth:</strong>
                    ${data.date_of_birth || 'Not provided'}
                </p>

                <p>
                    <strong>Address:</strong>
                    ${data.address || 'Not provided'}
                </p>

                <p>
                    <strong>About:</strong>
                    ${data.about || 'Not provided'}
                </p>

                <button type="button" class="update-btn">Update Profile</button>

            </div>
        `;

    }


    // ==============================
    // GET TEACHER COURSES
    // GET /teachers/me/courses
    // ==============================

    async function getTeacherCourses() {

        const token =
            localStorage.getItem('access_token');


        if (!token) {

            alert('Please login first.');

            window.location.href = 'login.html';

            return;
        }


        try {

            const response = await fetch(
                `${API_BASE_URL}/teachers/me/courses`,
                {
                    method: 'GET',

                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json'
                    }
                }
            );


            const data = await response.json();


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

                    window.location.href = 'login.html';

                } else {

                    alert(
                        data.detail ||
                        'Courses পাওয়া যাচ্ছে না.'
                    );

                }

                return;
            }


            // Display courses
            displayTeacherCourses(data);

        } catch (error) {

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
            document.getElementById('my-courses');


        if (!courseSection) return;


        if (!Array.isArray(courses) || courses.length === 0) {

            courseSection.innerHTML = `
                <h2>My Courses</h2>
                <p>No courses found.</p>
            `;

            return;
        }


        let coursesHTML = `

            <h2>My Courses</h2>

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
                        <strong>Language:</strong>
                        ${course.course_language || 'Not provided'}
                    </p>

                    <p>
                        <strong>Price:</strong>
                        ${
                            course.course_paid
                            ? `${course.course_price || 0} ${course.course_price_currency || 'INR'}`
                            : 'Free'
                        }
                    </p>

                </div>

            `;

        });


        coursesHTML += `</div>`;


        courseSection.innerHTML = coursesHTML;

    }


    // ==============================
    // INITIAL TOKEN CHECK & PROFILE LOAD
    // ==============================

    const token =
        localStorage.getItem('access_token');


    if (token) {

        console.log(
            'Teacher page: Access token found.'
        );

        // পেজ লোড হওয়া মাত্রই টিচারের নাম এবং About হেডারে দেখানোর জন্য API কলটি চালু করা হলো
        getTeacherProfile();

    } else {

        console.warn(
            'Teacher page: No access token found.'
        );

    }

});