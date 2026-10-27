/* ==========================================================
   teacher.js  -  Teacher dashboard shell logic
   Works exactly like student.js:
   - sidebar + topbar stay fixed
   - every page is downloaded with fetch() and shown in #main-content
   ========================================================== */

/* ==========================================================
   CONFIGURATION
   ========================================================== */

// Base URL of the FastAPI backend
const API_BASE_URL = 'http://127.0.0.1:8000';

// Page the user is sent to after logging out (change if your login page has another name)
const LOGIN_PAGE = 'login.html';

// The localStorage key where the login token is saved
const TOKEN_KEY = 'access_token';


/* ==========================================================
   DEFAULT PROFILE PICTURES (by gender)
   When a user has NOT uploaded a photo, we draw a default avatar
   that matches the gender chosen at sign up:
     m -> male avatar   (blue)
     f -> female avatar (pink, long hair)
     o / unknown -> neutral avatar (green)
   The avatars are small inline SVG images, so no image file has to
   be downloaded and nothing can fail to load.
   ========================================================== */

// Colors of each avatar: background, body (head + shoulders) and hair
const AVATAR_THEMES = {
    m: { bg: '#dbeafe', body: '#2563eb', hair: '#1e3a8a' },
    f: { bg: '#fce7f3', body: '#db2777', hair: '#831843' },
    o: { bg: '#e3f3ee', body: '#096858', hair: null }
};

// The gender of the logged-in user (m / f / o).
// It is filled in when the profile is loaded, so buildPicUrl() knows
// which default avatar to use even when it is called with one argument.
window.currentUserGender = '';

/**
 * Returns a "data:" image URL containing the default avatar
 * for the given gender code (m / f / o, or male / female).
 */
function defaultAvatar(gender) {
    const g = String(gender || '').toLowerCase();

    // Decide which avatar to draw
    let key = 'o';
    if (g === 'm' || g === 'male') key = 'm';
    if (g === 'f' || g === 'female') key = 'f';

    const t = AVATAR_THEMES[key];
    let hairBack = '';   // hair drawn BEHIND the head (long hair)
    let hairFront = '';  // hair drawn ON TOP of the head (fringe / short hair)

    if (key === 'm') {
        // Short hair cap
        hairFront = `<path d="M69 76C67 50 84 40 100 40S133 50 131 76C124 64 114 58 100 58S76 64 69 76Z" fill="${t.hair}"/>`;
    }

    if (key === 'f') {
        // Long hair falling behind the shoulders + a fringe on the forehead
        hairBack = `<path d="M64 84C62 48 80 38 100 38S138 48 136 84L142 140C130 134 124 126 122 112L78 112C76 126 70 134 58 140Z" fill="${t.hair}"/>`;
        hairFront = `<path d="M71 74C74 56 86 50 100 50S126 56 129 74C118 66 110 62 100 62S82 66 71 74Z" fill="${t.hair}"/>`;
    }

    // Order matters: background, back hair, shoulders, head, front hair
    const svg =
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">` +
        `<rect width="200" height="200" fill="${t.bg}"/>` +
        hairBack +
        `<path d="M40 200C40 140 70 124 100 124S160 140 160 200Z" fill="${t.body}"/>` +
        `<circle cx="100" cy="80" r="30" fill="${t.body}"/>` +
        hairFront +
        `</svg>`;

    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}


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
 * - No path            -> default avatar for the user's gender
 * - Already a full URL -> use as is
 * - Relative path      -> prefix with the API address and add a
 *                         timestamp (?t=...) so the browser does not
 *                         show an old cached picture after an update.
 *
 * The second argument (gender) is optional. When it is left out, the
 * gender of the logged-in user (window.currentUserGender) is used.
 */
function buildPicUrl(path, gender) {
    if (!path) {
        return defaultAvatar(gender !== undefined ? gender : window.currentUserGender);
    }
    if (path.startsWith('http')) return path;
    return `${API_BASE_URL}/${path.replace(/^\/+/, '')}?t=${Date.now()}`;
}


/* ---------- LOGOUT ---------- */
function logoutUser() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('token_type');
    window.location.replace(LOGIN_PAGE);
}

/* ==========================================================
   LOAD TEACHER PROFILE (GET /api/v1/teachers/me)
   Fills the topbar (name + picture) and, if the Settings
   page is open, the profile fields there as well.
   ========================================================== */
async function loadTeacherProfile() {
    const token = localStorage.getItem(TOKEN_KEY);

    // Not logged in -> go to the login page
    if (!token) {
        window.location.replace(LOGIN_PAGE);
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/teachers/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        // Token expired -> log out
        if (response.status === 401) {
            logoutUser();
            return;
        }

        if (!response.ok) {
            throw new Error('Failed to load profile (' + response.status + ')');
        }

        const data = await response.json();

        // Remember the gender FIRST, so every picture below (and in other
        // scripts such as update_profile.js) gets the right default avatar.
        window.currentUserGender = data.gender || '';

        // ---- Settings page fields (exist only when settings.html is loaded) ----
        setText('disp-id', data.user ? data.user.id : '');
        setText('disp-first-name', data.first_name);
        setText('disp-last-name', data.last_name);
        setText('disp-email', data.user ? data.user.email_id : '');
        setText('disp-phone', data.phone_no);
        setText('disp-gender', formatGender(data.gender));
        setText('disp-dob', data.date_of_birth);
        setText('disp-address', data.address);
        setText('disp-about', data.about);

        const pic = document.getElementById('disp-profile-pic');
        if (pic) pic.src = buildPicUrl(data.profile_pic, data.gender);

        // ---- Topbar: small picture + first name ----
        const topPic = document.querySelector('.topbar .profile-img');
        if (topPic) topPic.src = buildPicUrl(data.profile_pic, data.gender);

        const nameEl = document.getElementById('teacherUserName');
        if (nameEl && data.first_name) nameEl.innerText = data.first_name;
    } catch (error) {
        console.error('Error fetching profile:', error);
    }
}

/* ==========================================================
   PAGE -> SIDEBAR LINK MAP
   Pages that have no sidebar link of their own highlight the
   link they belong to.
   ========================================================== */
const PAGE_TO_NAV = {
    'teacher_courses.html': 'teacher_courses.html',
    'add_course.html': 'teacher_courses.html',
    'edit_course.html': 'teacher_courses.html',
    'settings.html': 'settings.html',
    'update_profile.html': 'settings.html'
};

/* ==========================================================
   MAIN SETUP (runs once the HTML is fully loaded)
   ========================================================== */
document.addEventListener('DOMContentLoaded', () => {

    const navLinks = document.querySelectorAll('.nav-link[data-page]');
    const mainContent = document.getElementById('main-content');
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const logoutBtn = document.getElementById('logoutBtn');

    // <script> tags inserted with innerHTML do NOT run, so we recreate them
    function runScripts(container) {
        container.querySelectorAll('script').forEach(oldScript => {
            const newScript = document.createElement('script');
            if (oldScript.getAttribute('src')) {
                newScript.src = oldScript.getAttribute('src');
            } else {
                newScript.textContent = oldScript.textContent;
            }
            oldScript.replaceWith(newScript);
        });
    }

    // Finds the sidebar link that belongs to a page (query string ignored)
    function navFor(pageUrl) {
        const clean = pageUrl.split('?')[0];
        const key = PAGE_TO_NAV[clean] || clean;
        return document.querySelector(`.nav-link[data-page="${key}"]`);
    }

    // Highlights one sidebar link, removes the highlight from the others
    function updateActiveButton(targetLink) {
        navLinks.forEach(link => link.classList.remove('active'));
        if (targetLink) targetLink.classList.add('active');
    }

    // Downloads a page and shows it inside the content area
    async function fetchAndRenderPage(pageUrl) {
        try {
            mainContent.innerHTML = '<p style="color: #096858;">Loading page...</p>';

            const response = await fetch(pageUrl, { cache: 'no-cache' });
            if (!response.ok) {
                throw new Error(`Page not found (${response.status})`);
            }

            const htmlData = await response.text();
            mainContent.innerHTML = htmlData;
            runScripts(mainContent);

            // The settings page needs the profile data
            if (pageUrl.split('?')[0] === 'settings.html') {
                loadTeacherProfile();
            }

            mainContent.scrollTop = 0;
        } catch (error) {
            mainContent.innerHTML = `
                <div style="color: #d9534f;">
                    <h2>ERROR!</h2>
                    <p>Page missing or local file issue. Please check the file name: ${pageUrl}</p>
                </div>
            `;
            console.error('Fetch Error:', error);
        }
    }

    // Global helper: any page can open another page inside the dashboard
    //   window.loadDashboardPage('add_course.html')
    window.loadDashboardPage = function (pageUrl) {
        updateActiveButton(navFor(pageUrl));
        fetchAndRenderPage(pageUrl);
    };

    // Used by update_profile.js after "Save changes"
    window.goToSettings = function () {
        updateActiveButton(navFor('settings.html'));
        fetchAndRenderPage('settings.html');
        loadTeacherProfile();
    };

    // ---- Sidebar menu clicks (Courses, Settings) ----
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
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

    // ---- Logout ----
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logoutUser();
        });
    }

    // ---- Normal <a> links INSIDE loaded pages (e.g. "Update Profile" in settings.html) ----
    mainContent.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (!link) return;

        const href = link.getAttribute('href');
        // Ignore empty links, "#" anchors, external links and new-tab links
        if (!href || href.startsWith('#') || href.startsWith('http') || link.target === '_blank') return;

        e.preventDefault();
        window.loadDashboardPage(href);
    });

    // ---- Initial page ----
    if (window.location.hash === '#settings') {
        window.goToSettings();
    } else {
        window.loadDashboardPage('teacher_courses.html');
    }

    // Name + picture for the topbar
    loadTeacherProfile();

    // ---- Mobile sidebar open/close ----
    if (menuToggle && sidebarOverlay) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
            sidebarOverlay.classList.toggle('active');
        });

        sidebarOverlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
            sidebarOverlay.classList.remove('active');
        });
    }
});