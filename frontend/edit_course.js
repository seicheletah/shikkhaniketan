/* ==========================================================
   edit_course.js  (full file - replace your old one)

   Runs every time edit_course.html is loaded INTO the teacher dashboard.
   - course id comes from window.editCourseId (set by teacher_courses.js)
   - loads the course:   GET    /courses/{id}
   - saves changes:      PATCH  /teachers/me/courses/{id}
   - deletes the course: DELETE /teachers/me/courses/{id}
   - after save / delete / cancel it goes back to the courses page
     inside the dashboard.

   FIX: the old version sent the visible text of the language dropdown
   (e.g. "Bengali (বাংলা)") to the API, which only accepts
   english / bengali / hindi. Now a normal <select> with those exact
   values is used.
   ========================================================== */
(function () {

    const root = document.getElementById('ec-wrapper');
    if (!root) return; // page was replaced already

    const API = 'http://127.0.0.1:8000/api/v1';
    const token = localStorage.getItem('access_token');

    if (!token) {
        window.location.replace('login.html');
        return;
    }

    // Back to the courses page (inside the dashboard)
    function goToCourses() {
        if (typeof window.loadDashboardPage === 'function') {
            window.loadDashboardPage('teacher_courses.html');
        } else {
            window.location.href = 'teacher.html';
        }
    }

    // The id was saved by the "Edit Course" button
    const courseId = window.editCourseId;
    if (!courseId) {
        alert('Course ID not found.');
        goToCourses();
        return;
    }

    const $ = id => document.getElementById(id);

    const form = $('ecForm');
    const nameInput = $('ecName');
    const detailsInput = $('ecDetails');
    const languageInput = $('ecLanguage');
    const paidInput = $('ecPaid');
    const priceInput = $('ecPrice');
    const saveBtn = $('ecSaveBtn');

    const deleteBtn = $('ecDeleteBtn');
    const modal = $('ecModal');
    const modalName = $('ecModalName');
    const modalCancel = $('ecModalCancel');
    const modalConfirm = $('ecModalConfirm');
    const toast = $('ecToast');

    let loadedCourseName = '';

    function headers() {
        return {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
            'Content-Type': 'application/json'
        };
    }

    // ---------------- TOAST ----------------
    let toastTimer = null;

    function showToast(message, bgColor = '#096858') {
        toast.textContent = message;
        toast.style.backgroundColor = bgColor;
        toast.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
    }

    // FastAPI error -> readable text (detail can be a string or a list)
    function errorTextFrom(bodyText, fallback) {
        try {
            const data = JSON.parse(bodyText);
            if (typeof data.detail === 'string') return data.detail;
            if (Array.isArray(data.detail) && data.detail[0] && data.detail[0].msg) {
                return data.detail[0].msg;
            }
        } catch (e) {
            // not JSON (e.g. "Internal Server Error"): use the fallback
        }
        return fallback;
    }

    // ---------------- PRICE FIELD ----------------
    // Free course -> price is 0 and the field is disabled
    function togglePrice() {
        const paid = paidInput.value === 'yes';
        priceInput.disabled = !paid;
        if (!paid) priceInput.value = '';
    }
    paidInput.addEventListener('change', togglePrice);

    // ---------------- LOAD COURSE ----------------
    async function loadCourse() {
        try {
            const response = await fetch(`${API}/courses/${courseId}`, {
                headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
            });

            if (response.status === 401) {
                localStorage.removeItem('access_token');
                window.location.replace('login.html');
                return;
            }
            if (!response.ok) {
                throw new Error(`Failed to load course. Status: ${response.status}`);
            }

            const course = await response.json();

            loadedCourseName = course.course_name || '';
            nameInput.value = course.course_name || '';
            detailsInput.value = course.course_details || '';

            const lang = String(course.course_language || '').toLowerCase();
            if (['english', 'hindi', 'bengali'].includes(lang)) languageInput.value = lang;

            const isPaid = course.course_paid === true || course.course_paid === 1 ||
                course.course_paid === 'true' || course.course_paid === '1';
            paidInput.value = isPaid ? 'yes' : 'no';
            priceInput.value = course.course_price ?? '';

            togglePrice();
        } catch (error) {
            console.error('Course loading error:', error);
            showToast('Failed to load course information.', '#b91c1c');
        }
    }

    // ---------------- SAVE (PATCH) ----------------
    form.addEventListener('submit', async event => {
        event.preventDefault();

        const courseName = nameInput.value.trim();
        if (!courseName) {
            showToast('Please enter course name.', '#b91c1c');
            return;
        }

        const coursePaid = paidInput.value === 'yes';
        let coursePrice = 0;

        if (coursePaid) {
            const priceValue = priceInput.value.trim();
            if (!priceValue) {
                showToast('Please enter course price.', '#b91c1c');
                return;
            }
            coursePrice = Number(priceValue);
            if (isNaN(coursePrice) || coursePrice < 0) {
                showToast('Please enter a valid course price.', '#b91c1c');
                return;
            }
        }

        const updateData = {
            course_name: courseName,
            course_details: detailsInput.value.trim(),
            course_language: languageInput.value,   // english | hindi | bengali
            course_paid: coursePaid,
            course_price: coursePrice,
            course_price_currency: 'INR'
        };

        saveBtn.disabled = true;

        try {
            // Teacher-specific endpoint (NOT the admin one)
            const response = await fetch(`${API}/teachers/me/courses/${courseId}`, {
                method: 'PATCH',
                headers: headers(),
                body: JSON.stringify(updateData)
            });

            if (response.status === 401) {
                localStorage.removeItem('access_token');
                window.location.replace('login.html');
                return;
            }

            if (!response.ok) {
                const bodyText = await response.text();
                let fallback = 'Failed to update course.';
                if (response.status === 403) fallback = 'You are not allowed to edit this course.';
                if (response.status === 404) fallback = 'Course not found.';
                showToast(errorTextFrom(bodyText, fallback), '#b91c1c');
                saveBtn.disabled = false;
                return;
            }

            showToast('Course updated successfully!');
            setTimeout(goToCourses, 1000);

        } catch (error) {
            console.error('Course update error:', error);
            showToast('Something went wrong while updating course.', '#b91c1c');
            saveBtn.disabled = false;
        }
    });

    // ---------------- CANCEL ----------------
    $('ecCancelBtn').addEventListener('click', () => {
        if (confirm('Are you sure you want to cancel?')) goToCourses();
    });

    // ==========================================================
    // DELETE COURSE   (DELETE /teachers/me/courses/{id} -> 204)
    // 1. "Delete course" opens the pop-up (nothing is deleted yet)
    // 2. "Yes, delete" sends the request
    // ==========================================================
    function openModal() {
        modalName.textContent = loadedCourseName ? `"${loadedCourseName}"` : 'this course';
        modal.classList.add('is-open');
        modal.setAttribute('aria-hidden', 'false');
    }

    function closeModal() {
        if (modalConfirm.disabled) return; // do not close while deleting
        modal.classList.remove('is-open');
        modal.setAttribute('aria-hidden', 'true');
    }

    async function deleteCourse() {
        modalConfirm.disabled = true;
        modalCancel.disabled = true;
        modalConfirm.textContent = 'Deleting...';

        let deleted = false;

        try {
            const response = await fetch(`${API}/teachers/me/courses/${courseId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
            });

            if (response.status === 401) {
                localStorage.removeItem('access_token');
                window.location.replace('login.html');
                return;
            }

            if (response.ok) {
                deleted = true;
            } else {
                const bodyText = await response.text();
                let fallback = response.status >= 500
                    ? `Server error (${response.status}). The course could not be deleted. Check the backend terminal.`
                    : 'Failed to delete course.';
                if (response.status === 403) fallback = 'You are not allowed to delete this course.';
                if (response.status === 404) fallback = 'Course not found. It may already be deleted.';
                showToast(errorTextFrom(bodyText, fallback), '#b91c1c');
            }
        } catch (error) {
            console.error('Course delete error:', error);
            showToast('Something went wrong while deleting the course.', '#b91c1c');
        }

        // Give the buttons back, then close the pop-up
        modalConfirm.disabled = false;
        modalCancel.disabled = false;
        modalConfirm.textContent = 'Yes, delete';
        closeModal();

        if (deleted) {
            if (localStorage.getItem('selected_course_id') === String(courseId)) {
                localStorage.removeItem('selected_course_id');
            }
            showToast('Course deleted successfully.');
            setTimeout(goToCourses, 1000);
        }
    }

    deleteBtn.addEventListener('click', openModal);
    modalCancel.addEventListener('click', closeModal);
    modalConfirm.addEventListener('click', deleteCourse);

    // Click on the dark area closes the pop-up
    modal.addEventListener('click', event => {
        if (event.target === modal) closeModal();
    });

    // Escape closes the pop-up (old listener from a previous visit is removed first)
    if (window.__ecKeyHandler) document.removeEventListener('keydown', window.__ecKeyHandler);
    window.__ecKeyHandler = event => {
        if (event.key === 'Escape') closeModal();
    };
    document.addEventListener('keydown', window.__ecKeyHandler);

    // ---------------- START ----------------
    loadCourse();
})();