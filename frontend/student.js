document.addEventListener('DOMContentLoaded', () => {

    const API_BASE_URL = 'http://127.0.0.1:8000/api/v1';

    const navItems = document.querySelectorAll('.nav-item');
    const pageSections = document.querySelectorAll('.page-section');

    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');


    // ==========================================
    // PAGE NAVIGATION
    // ==========================================

    navItems.forEach(item => {

        item.addEventListener('click', (e) => {

            e.preventDefault();

            const targetPage = item.getAttribute('data-page');

            if (!targetPage) return;


            navItems.forEach(nav => {
                nav.classList.remove('active');
            });

            pageSections.forEach(section => {
                section.classList.remove('active');
            });


            item.classList.add('active');


            const targetSection =
                document.getElementById(targetPage);

            if (targetSection) {
                targetSection.classList.add('active');
            }


            // Profile click
            if (targetPage === 'profile') {
                getStudentProfile();
            }


            closeMobileSidebar();

        });

    });


    // ==========================================
    // MOBILE SIDEBAR
    // ==========================================

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


    // ==========================================
    // GET LOGGED-IN STUDENT
    // GET /api/v1/students/me
    // ==========================================

    async function getStudentProfile() {

        const token =
            localStorage.getItem('access_token');


        if (!token) {

            alert('Please login first.');

            window.location.href = 'login.html';

            return;
        }


        try {

            console.log('Calling Student API...');


            const response = await fetch(
                `${API_BASE_URL}/students/me`,
                {
                    method: 'GET',

                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json'
                    }
                }
            );


            const data = await response.json();


            console.log('Student API Status:', response.status);
            console.log('Student API Response:', data);


            // ==================================
            // SUCCESS
            // ==================================

            if (response.ok) {

                console.log(
                    'Student details loaded successfully'
                );

                displayStudentProfile(data);

                return;
            }


            // ==================================
            // UNAUTHORIZED
            // ==================================

            if (response.status === 401) {

                alert(
                    'Login expired. Please login again.'
                );

                localStorage.removeItem('access_token');
                localStorage.removeItem('token_type');

                window.location.href = 'login.html';

                return;
            }


            // ==================================
            // BACKEND STUDENT NOT FOUND
            // ==================================

            if (
                response.status === 404 &&
                data.detail === 'student id not found'
            ) {

                alert(
                    'Student profile backend-এ পাওয়া যাচ্ছে না.'
                );

                console.error(
                    'Backend error: Student record not found for this user.'
                );

                return;
            }


            // ==================================
            // OTHER ERROR
            // ==================================

            console.error(
                'Student API Error:',
                data
            );

            alert(
                data.detail ||
                'Unable to load student details.'
            );


        } catch (error) {

            console.error(
                'Fetch Error:',
                error
            );

            alert(
                'Backend server-এর সাথে connection হচ্ছে না!'
            );

        }

    }


    // ==========================================
    // DISPLAY STUDENT PROFILE
    // ==========================================

    function displayStudentProfile(data) {

        const profileSection =
            document.getElementById('profile');


        if (!profileSection) return;


        const firstName =
            data.first_name || '';

        const lastName =
            data.last_name || '';

        const email =
            data.user?.email_id || '';

        const userId =
            data.user?.id || 'Not available';


        profileSection.innerHTML = `

            <h2>User Profile</h2>

            <div class="profile-details">

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

            </div>

        `;

    }


    // ==========================================
    // LOGOUT
    // ==========================================

    const logoutButton =
        document.querySelector('.nav-item.logout');


    if (logoutButton) {

        logoutButton.addEventListener('click', (e) => {

            e.preventDefault();

            localStorage.removeItem('access_token');
            localStorage.removeItem('token_type');

            alert('Logged out successfully!');

            window.location.href = 'login.html';

        });

    }

});