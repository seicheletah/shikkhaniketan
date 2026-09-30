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
    console.log('loadStudentProfile started');
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
        console.log('Student profile:', data);

        setText('disp-first-name', data.first_name);
        setText('disp-last-name', data.last_name);
        setText('disp-email', data.user ? data.user.email_id : '');
        setText('disp-phone', data.phone_no);
        setText('disp-gender', formatGender(data.gender));
        setText('disp-dob', data.date_of_birth);
        setText('disp-address', data.address);
        setText('disp-about', data.about);

        // Settings পেজের ছবি
        const pic = document.getElementById('disp-profile-pic');
        if (pic) pic.src = buildPicUrl(data.profile_pic);

        // টপবারের ছবি
        const topPic = document.querySelector('.topbar .profile-img');
        if (topPic) topPic.src = buildPicUrl(data.profile_pic);

        // টপবারে নাম
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

    // Fetch API দিয়ে ডাইনামিকালি পেজ লোড করার ফাংশন
    async function fetchAndRenderPage(pageUrl) {
        try {
            mainContent.innerHTML = '<p style="color: #096858;">Loading page...</p>';

            const response = await fetch(pageUrl);
            if (!response.ok) {
                throw new Error(`Page not found (${response.status})`);
            }

            const htmlData = await response.text();

            // নির্দিষ্ট কন্টেন্ট বক্সে HTML ডাটা ঢুকানো
            mainContent.innerHTML = htmlData;

            // settings পেজ লোড হলে প্রোফাইল ডেটা আনো
            if (pageUrl.includes('settings')) {
                loadStudentProfile();
            }

            // পেজের স্ক্রোল একদম ওপরে নিয়ে যাওয়া
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

    // সাইডবারের অ্যাক্টিভ বাটন আপডেট করার ফাংশন
    function updateActiveButton(targetLink) {
        navLinks.forEach(link => link.classList.remove('active'));
        if (targetLink) {
            targetLink.classList.add('active');
        }
    }

    // ১. সাইডবার লিংক ক্লিক হ্যান্ডলার
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

    // ২. মেইন কন্টেন্টের ভেতরের লিংকগুলোতে (যেমন: update_profile.html) ক্লিক হ্যান্ডেল করা
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

    // প্রথমবার সাইট ওপেন করলে ডিফল্টভাবে courses.html লোড হবে
    fetchAndRenderPage('courses.html');

    // টপবারের ছবি ও নাম প্রথম থেকেই দেখানোর জন্য
    loadStudentProfile();

    // মোবাইল মেনু টগল লজিক
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