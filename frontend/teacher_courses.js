/* ==========================================================
   teacher_courses.js
   Runs every time teacher_courses.html is loaded into the dashboard.
   - loads the teacher's courses (GET /teachers/me/courses)
   - newest course first, search, rating, type, price
   - "Publish New Course" -> add_course.html (inside the dashboard)
   - "Edit Course"        -> edit_course.html (inside the dashboard)
   Wrapped in (function(){ ... })() so variables never clash when
   the page is loaded again.
   ========================================================== */
(function () {

    const root = document.getElementById('tc-wrapper');
    if (!root) return; // the page was already replaced by another one

    const API = 'http://127.0.0.1:8000/api/v1';
    const token = localStorage.getItem('access_token');

    if (!token) {
        window.location.replace('login.html');
        return;
    }

    const listEl = document.getElementById('tcCourseList');
    const searchEl = document.getElementById('tcSearch');
    const totalEl = document.getElementById('tcTotalPurchased');
    const publishBtn = document.getElementById('tcPublishBtn');

    const authHeaders = { Authorization: `Bearer ${token}`, Accept: 'application/json' };

    let allCourses = [];

    // ---------- helpers ----------

    // Escapes text so course names can never break the HTML
    function esc(value) {
        const div = document.createElement('div');
        div.textContent = value == null ? '' : String(value);
        return div.innerHTML;
    }

    // Creation time: created_at field first, otherwise the UUID v7 timestamp
    function createdTime(course) {
        const dateValue = course.created_at || course.createdAt || course.created ||
            course.creation_date || course.created_date || course.uploaded_at || course.uploadedAt;

        if (dateValue) {
            const t = new Date(dateValue).getTime();
            if (!isNaN(t)) return t;
        }

        const m = String(course.id || '').match(/^([0-9a-f]{8})-([0-9a-f]{4})-/i);
        if (m) {
            const t = parseInt(m[1] + m[2], 16);
            if (!isNaN(t) && t > 0) return t;
        }
        return 0;
    }

    function newestFirst(courses) {
        return [...courses].sort((a, b) => createdTime(b) - createdTime(a));
    }

    function isPaid(course) {
        return course.course_paid === true || course.course_paid === 1 ||
            course.course_paid === 'true' || course.course_paid === '1';
    }

    function resourceType(course) {
        const value = String(course.course_resource_type || course.resource_type ||
            course.course_type || course.type || 'video').toLowerCase();
        return (value.includes('document') || value.includes('pdf') || value.includes('doc'))
            ? 'Document' : 'Video';
    }

    function capitalize(text) {
        return text ? text.charAt(0).toUpperCase() + text.slice(1) : '-';
    }

    // ---------- ratings ----------

    // Start with the numbers the course already has, then try the review endpoint
    async function loadRatings() {
        await Promise.all(allCourses.map(async course => {
            course.average_rating = Number(course.avg_rating) || 0;
            course.total_reviews = Number(course.total_rating) || 0;

            try {
                const res = await fetch(`${API}/courses/${course.id}/review`, { headers: authHeaders });
                if (!res.ok) return;

                const data = await res.json();
                const reviews = Array.isArray(data) ? data : (Array.isArray(data.reviews) ? data.reviews : []);

                if (data && !Array.isArray(data) && data.average_rating !== undefined) {
                    course.average_rating = Number(data.average_rating) || 0;
                    course.total_reviews = Number(data.total_reviews ?? data.review_count ?? reviews.length) || 0;
                    return;
                }

                const ratings = reviews
                    .map(r => Number(r.rating ?? r.rate))
                    .filter(r => !isNaN(r));

                if (ratings.length) {
                    course.average_rating = ratings.reduce((s, r) => s + r, 0) / ratings.length;
                    course.total_reviews = ratings.length;
                }
            } catch (error) {
                console.error('Rating loading failed for course', course.id, error);
            }
        }));
    }

    // ---------- render ----------

    function cardHtml(course) {
        const price = isPaid(course)
            ? `${esc(course.course_price_currency || 'INR')} ${esc(course.course_price ?? 0)}`
            : 'Free';

        const rating = Number(course.average_rating) || 0;
        const reviews = Number(course.total_reviews) || 0;
        const type = resourceType(course);

        return `
            <div class="tp-course" data-id="${esc(course.id)}">
                <div class="tp-course-info">
                    <span class="tp-icon"><i class="fa-solid fa-book" aria-hidden="true"></i></span>
                    <div class="tp-course-text">
                        <h4>${esc(course.course_name || 'Course Name')}</h4>
                        <p>${esc(course.course_details || 'Course details')}</p>
                    </div>
                </div>

                <div class="tp-metrics">
                    <div class="tp-metric"><span>Price</span><strong>${price}</strong></div>
                    <div class="tp-metric"><span>Language</span><strong>${esc(capitalize(course.course_language))}</strong></div>
                    <div class="tp-metric">
                        <span>Rating</span>
                        <strong><i class="fa-solid fa-star tp-star" aria-hidden="true"></i> ${rating > 0 ? rating.toFixed(1) : 'No rating'}</strong>
                        <small>${reviews} ${reviews === 1 ? 'Review' : 'Reviews'}</small>
                    </div>
                    <div class="tp-metric">
                        <span>Type</span>
                        <strong><i class="fa-solid ${type === 'Document' ? 'fa-file-lines' : 'fa-video'}" aria-hidden="true"></i> ${type}</strong>
                    </div>
                </div>

                <button type="button" class="tp-btn tp-btn-sm" data-edit>Edit Course</button>
            </div>`;
    }

    function renderCourses(courses) {
        if (!courses.length) {
            listEl.innerHTML = '<p class="tp-empty">No courses found.</p>';
            return;
        }
        listEl.innerHTML = newestFirst(courses).map(cardHtml).join('');
    }

    // ---------- load ----------

    async function loadCourses() {
        try {
            const res = await fetch(`${API}/teachers/me/courses`, { headers: authHeaders });

            if (res.status === 401) {
                localStorage.removeItem('access_token');
                window.location.replace('login.html');
                return;
            }
            if (!res.ok) {
                listEl.innerHTML = '<p class="tp-empty">No courses found.</p>';
                return;
            }

            const data = await res.json();
            allCourses = Array.isArray(data) ? data : (data.courses || []);

            // Total purchased = sum of total_enrollment of all courses
            const total = allCourses.reduce((sum, c) => sum + (Number(c.total_enrollment) || 0), 0);
            totalEl.textContent = total;

            await loadRatings();
            if (document.getElementById('tc-wrapper') !== root) return; // page changed meanwhile
            renderCourses(allCourses);
        } catch (error) {
            console.error('Course Loading Error:', error);
            listEl.innerHTML = '<p class="tp-empty">Failed to load courses.</p>';
        }
    }

    // ---------- events ----------

    // One listener for all cards (event delegation)
    listEl.addEventListener('click', e => {
        const card = e.target.closest('.tp-course');
        if (!card) return;
        const id = card.dataset.id;

        // "Edit Course" button -> edit_course.html inside the dashboard
        if (e.target.closest('[data-edit]')) {
            window.editCourseId = id;
            window.loadDashboardPage('edit_course.html');
            return;
        }

        // Click on the card -> course details (separate page, as before)
        localStorage.setItem('selected_course_id', id);
        window.location.href = `course_details.html?id=${encodeURIComponent(id)}`;
    });

    searchEl.addEventListener('input', () => {
        const text = searchEl.value.trim().toLowerCase();
        renderCourses(allCourses.filter(c => (c.course_name || '').toLowerCase().includes(text)));
    });

    publishBtn.addEventListener('click', () => {
        window.loadDashboardPage('add_course.html');
    });

    loadCourses();
})();