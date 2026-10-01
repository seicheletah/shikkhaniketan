const API_BASE_URL = 'http://127.0.0.1:8000';
const DEFAULT_PIC = 'https://i.pravatar.cc/100?img=32';

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.innerText = value || '-';
}

function formatGender(g) {
    const map = { m: 'Male', f: 'Female', o: 'Other' };
    return map[g] || g || '-';
}

function buildPicUrl(path) {
    if (!path) return DEFAULT_PIC;
    if (path.startsWith('http')) return path;
    return `${API_BASE_URL}/${path.replace(/^\/+/, '')}?t=${Date.now()}`;
}

async function loadStudentProfile() {
    const token = localStorage.getItem('access_token');

    if (!token) {
        alert('Please login first.');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/students/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            throw new Error('Failed to load profile (' + response.status + ')');
        }

        const data = await response.json();

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
        if (pic) pic.src = buildPicUrl(data.profile_pic);

        const topPic = document.querySelector('.topbar .profile-img');
        if (topPic) topPic.src = buildPicUrl(data.profile_pic);

        const nameEl = document.getElementById('studentUserName');
        if (nameEl && data.first_name) nameEl.innerText = data.first_name;
    } catch (error) {
        console.error('Error fetching profile:', error);
    }
}


document.addEventListener('DOMContentLoaded', () => {
    const navLinks = document.querySelectorAll('.nav-link[data-page]');
    const mainContent = document.getElementById('main-content');
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    // innerHTML দিয়ে বসানো <script> ব্রাউজার নিজে রান করে না,
    // তাই নতুন করে বানিয়ে বসাচ্ছি যাতে রান হয়
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

    async function fetchAndRenderPage(pageUrl) {
        try {
            mainContent.innerHTML = '<p style="color: #096858;">Loading page...</p>';

            const response = await fetch(pageUrl);
            if (!response.ok) {
                throw new Error(`Page not found (${response.status})`);
            }

            const htmlData = await response.text();
            mainContent.innerHTML = htmlData;

            runScripts(mainContent);

            if (pageUrl.includes('settings')) {
                loadStudentProfile();
            }

            mainContent.scrollTop = 0;
        } catch (error) {
            mainContent.innerHTML = `
                <div style="color: #d9534f;">
                    <h2>ERROR!</h2>
                    <p>Page missing or local file issue. Please serve using Live Server.</p>
                </div>
            `;
            console.error('Fetch Error:', error);
        }
    }

    // অন্য পেজ (যেমন courses.js) থেকে ড্যাশবোর্ডের ভেতরে পেজ খোলার জন্য
    window.loadDashboardPage = function (pageUrl) {
        const matchingNav = document.querySelector(`.nav-link[data-page="${pageUrl}"]`);
        updateActiveButton(matchingNav);
        fetchAndRenderPage(pageUrl);
    };

    function updateActiveButton(targetLink) {
        navLinks.forEach(link => link.classList.remove('active'));
        if (targetLink) {
            targetLink.classList.add('active');
        }
    }

    // Update Profile সেভের পর Settings পেজে ফেরার জন্য
    window.goToSettings = function () {
        const settingsLink = document.querySelector('.nav-link[data-page="settings.html"]');
        updateActiveButton(settingsLink);
        fetchAndRenderPage('settings.html');
        loadStudentProfile();
    };

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const pageToLoad = link.getAttribute('data-page');

            updateActiveButton(link);
            fetchAndRenderPage(pageToLoad);

            if (window.innerWidth <= 768) {
                sidebar.classList.remove('open');
                sidebarOverlay.classList.remove('active');
            }
        });
    });

    mainContent.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (link && link.getAttribute('href') && !link.getAttribute('href').startsWith('#')) {
            e.preventDefault();
            const pageToLoad = link.getAttribute('href');

            const matchingNav = document.querySelector(`.nav-link[data-page="${pageToLoad}"]`);
            updateActiveButton(matchingNav);

            fetchAndRenderPage(pageToLoad);
        }
    });

    if (window.location.hash === '#settings') {
        window.goToSettings();
    } else {
        fetchAndRenderPage('courses.html');
    }

    loadStudentProfile();

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