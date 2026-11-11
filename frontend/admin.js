/* ==========================================================
   CONFIGURATION
   Change these values in ONE place if your setup changes.
   ========================================================== */

// Base URL of the FastAPI backend
const API_BASE_URL = 'http://127.0.0.1:8000';

// Page the user is sent to after logging out (or if not logged in as admin)
const LOGIN_PAGE = 'login.html';

// localStorage keys written by login.js / admin_signup.js
const TOKEN_KEY = 'access_token';
const ROLE_KEY = 'userRole';

// Page that is opened first inside the dashboard
const DEFAULT_PAGE = 'admin_dashboard.html';


/* ==========================================================
   AUTH GUARD
   Only a logged-in admin may stay on this page.
   Everyone else is sent to the login page.
   ========================================================== */
(function checkAdminAccess() {
    const token = localStorage.getItem(TOKEN_KEY);
    const role = localStorage.getItem(ROLE_KEY);

    if (!token || role !== 'admin') {
        window.location.replace(LOGIN_PAGE);
    }
})();


/* ==========================================================
   LOGOUT
   ========================================================== */

/**
 * Logs the admin out:
 * 1. Deletes all saved login data.
 * 2. Redirects to the login page.
 * location.replace() is used so the Back button cannot
 * return to the dashboard after logging out.
 */
function logoutUser() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('token_type');
    localStorage.removeItem(ROLE_KEY);
    localStorage.removeItem('role');
    window.location.replace(LOGIN_PAGE);
}


/* ==========================================================
   LOAD ADMIN PROFILE FROM THE API
   Fills the welcome text in the topbar.
   Uses GET /api/v1/users/me. If the response has no first_name,
   the part of the email before "@" is shown instead.
   ========================================================== */
async function loadAdminProfile() {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;

    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/users/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        // A 401 means the token is invalid or expired: log out
        if (response.status === 401) {
            logoutUser();
            return;
        }

        if (!response.ok) {
            throw new Error('Failed to load profile (' + response.status + ')');
        }

        const data = await response.json();

        // Prefer the first name, otherwise use the email prefix
        const name = data.first_name ||
            (data.email_id ? data.email_id.split('@')[0] : '');

        const nameEl = document.getElementById('adminUserName');
        if (nameEl && name) nameEl.innerText = name;

    } catch (error) {
        console.error('Error fetching admin profile:', error);
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
                newScript.src = oldScript.getAttribute('src');      // external script
            } else {
                newScript.textContent = oldScript.textContent;      // inline script
            }
            oldScript.replaceWith(newScript);  // swapping triggers execution
        });
    }

    /**
     * Downloads another HTML page and shows it inside the content area,
     * without reloading the whole site.
     */
    async function fetchAndRenderPage(pageUrl) {
        try {
            // Temporary message while the page is downloading
            mainContent.innerHTML = '<p style="color: #0f766e;">Loading page...</p>';

            const response = await fetch(pageUrl);
            if (!response.ok) {
                throw new Error(`Page not found (${response.status})`);
            }

            // Insert the downloaded HTML, then activate its scripts
            const htmlData = await response.text();
            mainContent.innerHTML = htmlData;
            runScripts(mainContent);

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

    // Global helper so OTHER scripts can open a page inside the dashboard:
    // window.loadDashboardPage('admin_users.html')
    window.loadDashboardPage = function (pageUrl) {
        const matchingNav = document.querySelector(`.nav-link[data-page="${pageUrl}"]`);
        updateActiveButton(matchingNav);
        fetchAndRenderPage(pageUrl);
    };

    // ---- Sidebar menu clicks ----
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();  // stop the browser from leaving the dashboard
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
            e.preventDefault();  // stop "#logout" from being added to the URL
            logoutUser();
        });
    }

    // ---- Links INSIDE the loaded pages ----
    // Event delegation: one listener handles clicks from any link,
    // even ones added later.
    mainContent.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        // Ignore empty links and "#" anchors
        if (link && link.getAttribute('href') && !link.getAttribute('href').startsWith('#')) {
            e.preventDefault();
            const pageToLoad = link.getAttribute('href');

            const matchingNav = document.querySelector(`.nav-link[data-page="${pageToLoad}"]`);
            updateActiveButton(matchingNav);

            fetchAndRenderPage(pageToLoad);
        }
    });

    // ---- Initial page load ----
    fetchAndRenderPage(DEFAULT_PAGE);

    // Load the admin name for the topbar
    loadAdminProfile();

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