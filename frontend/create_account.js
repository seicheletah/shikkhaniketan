document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // CONFIG
    // ==========================================

    const API_BASE = 'http://127.0.0.1:8000/api/v1';

    // API endpoints and dashboard page for each role (student / teacher only)
    const ROLE_CONFIG = {
        student: {
            profileUrl: `${API_BASE}/students/`,
            picUploadUrl: `${API_BASE}/students/profile-pic/upload`,
            redirectPage: 'student.html'
        },
        teacher: {
            profileUrl: `${API_BASE}/teachers/`,
            picUploadUrl: `${API_BASE}/teachers/profile-pic/upload`,
            redirectPage: 'teacher.html'
        }
    };

    // ==========================================
    // ELEMENTS
    // ==========================================

    const profileForm = document.getElementById('profileForm');
    const continueBtn = document.getElementById('continueBtn');

    const firstNameInput = document.getElementById('first-name');
    const lastNameInput = document.getElementById('last-name');
    const phoneInput = document.getElementById('phone');
    const genderSelect = document.getElementById('gender');
    const dobInput = document.getElementById('dob');
    const addressInput = document.getElementById('address');
    const aboutInput = document.getElementById('about');
    const picInput = document.getElementById('profile-pic');
    const picPreview = document.getElementById('pic-preview');

    if (!profileForm) {
        console.error('Profile form not found.');
        return;
    }

    // ==========================================
    // LOGIN DATA SAVED BY sign_up.js AFTER THE OTP WAS VERIFIED
    // ==========================================

    const accessToken = localStorage.getItem('access_token');
    const role = (localStorage.getItem('role') || '').toLowerCase();
    const config = ROLE_CONFIG[role];

    if (!accessToken || !config) {
        alert('Please sign up and verify your email first.');
        window.location.replace('sign_up.html');
        return;
    }

    // ==========================================
    // HELPERS
    // ==========================================

    function getErrorMessage(data, fallback) {
        if (data && typeof data.detail === 'string') return data.detail;
        if (data && Array.isArray(data.detail) && data.detail[0] && data.detail[0].msg) {
            return data.detail[0].msg;
        }
        return fallback;
    }

    function setButton(button, disabled, text) {
        button.disabled = disabled;
        button.textContent = text;
    }

    let profileCreated = false;   // so a retry does not create the profile twice

    // ==========================================
    // PROFILE PICTURE PREVIEW
    // ==========================================

    picInput.addEventListener('change', () => {
        const file = picInput.files[0];

        if (!file) {
            picPreview.style.display = 'none';
            return;
        }

        if (!file.type.startsWith('image/')) {
            alert('Please choose an image file.');
            picInput.value = '';
            picPreview.style.display = 'none';
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            alert('Image must be smaller than 2 MB.');
            picInput.value = '';
            picPreview.style.display = 'none';
            return;
        }

        picPreview.src = URL.createObjectURL(file);
        picPreview.style.display = 'block';
    });

    // ==========================================
    // CREATE THE STUDENT / TEACHER PROFILE -> OPEN THE DASHBOARD
    // ==========================================

    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!firstNameInput.value.trim() || !lastNameInput.value.trim() ||
            !phoneInput.value.trim() || !genderSelect.value || !dobInput.value) {
            alert('Please fill in all required fields.');
            return;
        }

        setButton(continueBtn, true, 'Saving...');

        try {

            // ---- Save the profile ----
            if (!profileCreated) {
                const profileData = {
                    first_name: firstNameInput.value.trim(),
                    last_name: lastNameInput.value.trim(),
                    phone_no: phoneInput.value.trim(),
                    gender: genderSelect.value,
                    date_of_birth: dobInput.value,
                    address: addressInput.value.trim(),
                    about: aboutInput.value.trim()
                };

                const response = await fetch(config.profileUrl, {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + accessToken
                    },
                    body: JSON.stringify(profileData)
                });

                const data = await response.json().catch(() => ({}));

                if (!response.ok) {
                    console.error('Profile creation error:', response.status, data);
                    alert(getErrorMessage(data, 'Profile creation failed. Please try again.'));
                    setButton(continueBtn, false, 'Finish');
                    return;
                }

                profileCreated = true;
            }

            // ---- Optional profile picture upload ----
            const pictureFile = picInput.files[0];

            if (pictureFile) {
                try {
                    const picForm = new FormData();
                    picForm.append('file', pictureFile);

                    // Do not set Content-Type here, the browser adds the boundary
                    const picResponse = await fetch(config.picUploadUrl, {
                        method: 'POST',
                        headers: { 'Authorization': 'Bearer ' + accessToken },
                        body: picForm
                    });

                    if (!picResponse.ok) {
                        console.error('Picture upload failed:', await picResponse.text());
                        alert('Profile created, but picture upload failed. You can upload it later from Update Profile.');
                    }
                } catch (err) {
                    console.error('Picture upload error:', err);
                }
            }

            // ---- Open the dashboard (student.html / teacher.html) ----
            window.location.replace(config.redirectPage);

        } catch (error) {
            console.error('API Error:', error);
            alert('Unable to connect to the server. Please try again.');
            setButton(continueBtn, false, 'Finish');
        }
    });

});