/* ==========================================================
   CONFIGURATION
   Change these values in ONE place if your setup changes.
   ========================================================== */

// Base URL of the FastAPI backend
const API_BASE_URL = 'http://127.0.0.1:8000';

// Picture shown when the student has not uploaded a profile photo
const DEFAULT_PIC = 'https://i.pravatar.cc/100?img=32';

// Page the user is sent to after logging out.
// NOTE: change this to your real login page file name if it is different.
const LOGIN_PAGE = 'login.html';

// The localStorage key where the login token is saved
const TOKEN_KEY = 'access_token';


/* ==========================================================
   SMALL HELPER FUNCTIONS
   ========================================================== */

/**
 * Safely writes text into an element found by its id.
 * Shows "-" when the value is empty so the UI never looks broken.
 */
function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.innerText = value || '-';
}

/**
 * Converts the short gender code from the database
 * (m / f / o) into a readable label.
 */
function formatGender(g) {
    const map = { m: 'Male', f: 'Female', o: 'Other' };
    return map[g] || g || '-';
}

/**
 * Builds a full image URL from the path stored in the database.
 * - No path            -> default picture
 * - Already a full URL -> use as is
 * - Relative path      -> prefix with the API address and add a
 *                         timestamp (?t=...) so the browser does not
 *                         show an old cached picture after an update.
 */
function buildPicUrl(path) {
    if (!path) return DEFAULT_PIC;
    if (path.startsWith('http')) return path;
    return `${API_BASE_URL}/${path.replace(/^\/+/, '')}?t=${Date.now()}`;
}


/* ==========================================================
   LOGOUT
   ========================================================== */

/**
 * Logs the user out:
 * 1. Deletes the saved login token (this is what "logs out" the user).
 * 2. Redirects to the login page.
 * We use location.replace() instead of location.href so the Back button
 * cannot return to the dashboard after logging out.
 */
function logoutUser() {
    localStorage.removeItem(TOKEN_KEY);
    window.location.replace(LOGIN_PAGE);
}


/* ==========================================================
   LOAD STUDENT PROFILE FROM THE API
   Fills the topbar (name + picture) and, if the settings page
   is open, the profile fields there as well.
   ========================================================== */
async function loadStudentProfile() {
    // Read the login token saved at login time
    const token = localStorage.getItem(TOKEN_KEY);

    // No token means the user is not logged in
    if (!token) {
        alert('Please login first.');
        return;
    }

    try {
        // Ask the backend for the current student's data.
        // The token goes in the Authorization header so the server knows who we are.
        const response = await fetch(`${API_BASE_URL}/api/v1/students/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        // Any non-2xx status (401, 404, 500...) is treated as a failure
        if (!response.ok) {
            throw new Error('Failed to load profile (' + response.status + ')');
        }

        const data = await response.json();

        // ---- Fill the settings page fields (they only exist when that page is loaded) ----
        setText('disp-id', data.user ? data.user.id : '');
        setText('disp-first-name', data.first_name);
        setText('disp-last-name', data.last_name);
        setText('disp-email', data.user ? data.user.email_id : '');
        setText('disp-phone', data.phone_no);
        setText('disp-gender', formatGender(data.gender));
        setText('disp-dob', data.date_of_birth);
        setText('disp-address', data.address);
        setText('disp-about', data.about);

        // Big profile picture on the settings page
        const pic = document.getElementById('disp-profile-pic');
        if (pic) pic.src = buildPicUrl(data.profile_pic);

        // Small profile picture on the right side of the topbar
        const topPic = document.querySelector('.topbar .profile-img');
        if (topPic) topPic.src = buildPicUrl(data.profile_pic);

        // Student's first name in the topbar welcome text
        const nameEl = document.getElementById('studentUserName');
        if (nameEl && data.first_name) nameEl.innerText = data.first_name;
    } catch (error) {
        console.error('Error fetching profile:', error);
    }
}


/* ==========================================================
   MAIN SETUP
   Runs once the HTML is fully loaded.
   ========================================================== */
document.addEventListener('DOMContentLoaded', () => {

    // ---- Grab all the elements we need ----

    // Only sidebar links that have a data-page attribute load a page.
    // Logout has no data-page, so it is excluded automatically.
    const navLinks = document.querySelectorAll('.nav-link[data-page]');

    const mainContent = document.getElementById('main-content');
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const logoutBtn = document.getElementById('logoutBtn');

    /**
     * Browsers do NOT run <script> tags inserted through innerHTML.
     * So we recreate each script element, which makes the browser run it.
     */
    function runScripts(container) {
        container.querySelectorAll('script').forEach(oldScript => {
            const newScript = document.createElement('script');
            if (oldScript.getAttribute('src')) {
                // External script: copy the src
                newScript.src = oldScript.getAttribute('src');
            } else {
                // Inline script: copy its code
                newScript.textContent = oldScript.textContent;
            }
            // Swapping the old element for the new one triggers execution
            oldScript.replaceWith(newScript);
        });
    }

    /**
     * Downloads another HTML page (courses, quiz, settings...) and
     * shows it inside the content area, without reloading the whole site.
     */
    async function fetchAndRenderPage(pageUrl) {
        try {
            // Temporary message while the page is downloading
            mainContent.innerHTML = '<p style="color: #096858;">Loading page...</p>';

            const response = await fetch(pageUrl);
            if (!response.ok) {
                throw new Error(`Page not found (${response.status})`);
            }

            // Insert the downloaded HTML, then activate its scripts
            const htmlData = await response.text();
            mainContent.innerHTML = htmlData;
            runScripts(mainContent);

            // The settings page needs the profile data to be filled in
            if (pageUrl.includes('settings')) {
                loadStudentProfile();
            }

            // Start the new page from the top
            mainContent.scrollTop = 0;
        } catch (error) {
            // Show a friendly error box if the page could not be loaded
            mainContent.innerHTML = `
                <div style="color: #d9534f;">
                    <h2>ERROR!</h2>
                    <p>Page missing or local file issue. Please serve using Live Server.</p>
                </div>
            `;
            console.error('Fetch Error:', error);
        }
    }

    /**
     * Highlights the given sidebar link as "active"
     * and removes the highlight from all the others.
     */
    function updateActiveButton(targetLink) {
        navLinks.forEach(link => link.classList.remove('active'));
        if (targetLink) {
            targetLink.classList.add('active');
        }
    }

    // Global helper so OTHER scripts (e.g. courses.js) can open a page
    // inside the dashboard: window.loadDashboardPage('quiz.html')
    window.loadDashboardPage = function (pageUrl) {
        const matchingNav = document.querySelector(`.nav-link[data-page="${pageUrl}"]`);
        updateActiveButton(matchingNav);
        fetchAndRenderPage(pageUrl);
    };

    // Global helper used after "Update Profile" is saved:
    // returns to the Settings page and refreshes the data.
    window.goToSettings = function () {
        const settingsLink = document.querySelector('.nav-link[data-page="settings.html"]');
        updateActiveButton(settingsLink);
        fetchAndRenderPage('settings.html');
        loadStudentProfile();
    };

    // ---- Sidebar menu clicks (Courses, Quiz, Settings) ----
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault(); // stop the browser from leaving the dashboard
            const pageToLoad = link.getAttribute('data-page');

            updateActiveButton(link);
            fetchAndRenderPage(pageToLoad);

            // On mobile, close the sidebar after choosing a page
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('open');
                sidebarOverlay.classList.remove('active');
            }
        });
    });

    // ---- Logout button ----
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault(); // stop the "#logout" hash from being added to the URL
            logoutUser();
        });
    }

    // ---- Links INSIDE the loaded pages ----
    // Event delegation: one listener on the container handles clicks
    // from any link, even ones added later.
    mainContent.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        // Ignore empty links and "#" anchors
        if (link && link.getAttribute('href') && !link.getAttribute('href').startsWith('#')) {
            e.preventDefault();
            const pageToLoad = link.getAttribute('href');

            // Highlight the matching sidebar item if there is one
            const matchingNav = document.querySelector(`.nav-link[data-page="${pageToLoad}"]`);
            updateActiveButton(matchingNav);

            fetchAndRenderPage(pageToLoad);
        }
    });

    // ---- Initial page load ----
    // If the URL ends with #settings open Settings, otherwise open Courses.
    if (window.location.hash === '#settings') {
        window.goToSettings();
    } else {
        fetchAndRenderPage('courses.html');
    }

    // Load the name and picture for the topbar
    loadStudentProfile();

    // ---- Mobile sidebar open/close ----
    if (menuToggle && sidebarOverlay) {
        // Hamburger button toggles the sidebar and the dark backdrop
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
            sidebarOverlay.classList.toggle('active');
        });

        // Tapping the dark backdrop closes the sidebar
        sidebarOverlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
            sidebarOverlay.classList.remove('active');
        });
    }
});