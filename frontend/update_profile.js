const UP_API_BASE_URL = 'http://127.0.0.1:8000';
const UP_LOGIN_PAGE = 'index.html';
const UP_DEFAULT_PIC = 'https://i.pravatar.cc/100?img=32';

function upPicUrl(path) {
    if (!path) return UP_DEFAULT_PIC;
    if (path.startsWith('http')) return path;
    return UP_API_BASE_URL + '/' + path.replace(/^\/+/, '') + '?t=' + Date.now();
}

let upRole = '';
let upProfilePath = '';
let upOriginalEmail = '';
let upOriginalProfile = {};
let upUserId = '';
let upBusy = false;


// ==========================================
// HELPERS
// ==========================================

function upGetToken() {
    return localStorage.getItem('access_token');
}

function upAuthHeaders(json) {
    const headers = { 'Authorization': 'Bearer ' + upGetToken() };
    if (json) {
        headers['Content-Type'] = 'application/json';
    }
    return headers;
}

function upShowMessage(text, type) {
    const el = document.getElementById('up-message');
    if (!el) return;
    el.textContent = text || '';
    el.className = 'up-message' + (type ? ' ' + type : '');
}

function upErrorText(result, fallback) {
    if (result && typeof result.detail === 'string') {
        return result.detail;
    }
    if (result && Array.isArray(result.detail) && result.detail[0] && result.detail[0].msg) {
        return result.detail[0].msg;
    }
    return fallback;
}

function upSetBusy(busy) {
    upBusy = busy;
    const save = document.getElementById('up-save-btn');
    const del = document.getElementById('up-delete-btn');
    if (save) save.disabled = busy;
    if (del) del.disabled = busy;
}

function upClearSession() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('token_type');
}

function upValue(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
}

function upSetValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value || '';
}

// Settings পেজে নিয়ে যাওয়া
function upGoToSettings() {
    if (typeof window.goToSettings === 'function') {
        window.goToSettings();
    } else {
        const page = upRole === 'teacher' ? 'teacher.html' : 'student.html';
        window.location.replace(page + '#settings');
    }
}

// ID দিয়ে email/password update (403 বা 404 হলে /me তে fallback)
async function upUpdateUserById(body) {
    if (upUserId) {
        const res = await fetch(UP_API_BASE_URL + '/api/v1/users/' + upUserId, {
            method: 'PATCH',
            headers: upAuthHeaders(true),
            body: JSON.stringify(body)
        });
        if (res.status !== 403 && res.status !== 404) return res;
    }
    return fetch(UP_API_BASE_URL + '/api/v1/users/me', {
        method: 'PATCH',
        headers: upAuthHeaders(true),
        body: JSON.stringify(body)
    });
}

// ID দিয়ে delete (403 বা 404 হলে /me তে fallback)
async function upDeleteUserById() {
    if (upUserId) {
        const res = await fetch(UP_API_BASE_URL + '/api/v1/users/' + upUserId, {
            method: 'DELETE',
            headers: upAuthHeaders(false)
        });
        if (res.status !== 403 && res.status !== 404) return res;
    }
    return fetch(UP_API_BASE_URL + '/api/v1/users/me', {
        method: 'DELETE',
        headers: upAuthHeaders(false)
    });
}

// নতুন ইমেইল/পাসওয়ার্ড দিয়ে আবার login করে নতুন token নেওয়া
async function upRelogin(email, password) {
    const body = new URLSearchParams();
    body.append('grant_type', 'password');
    body.append('username', email);
    body.append('password', password);
    body.append('scope', '');
    body.append('client_id', 'string');
    body.append('client_secret', 'string');

    const response = await fetch(UP_API_BASE_URL + '/api/v1/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body
    });

    if (!response.ok) return false;

    const result = await response.json();
    if (!result.access_token) return false;

    localStorage.setItem('access_token', result.access_token);
    localStorage.setItem('token_type', result.token_type || 'bearer');
    return true;
}


// ==========================================
// LOAD CURRENT DATA INTO THE FORM
// ==========================================

async function initUpdateProfile() {

    const form = document.getElementById('updateProfileForm');
    if (!form) return;

    if (!upGetToken()) {
        alert('Please login first.');
        window.location.replace(UP_LOGIN_PAGE);
        return;
    }

    if (form.dataset.loaded) return;
    form.dataset.loaded = '1';

    upShowMessage('Loading your details...', '');
    upSetBusy(true);

    try {

        const userResponse = await fetch(UP_API_BASE_URL + '/api/v1/users/me', {
            headers: upAuthHeaders(false)
        });

        if (userResponse.status === 401) {
            upClearSession();
            alert('Session expired. Please login again.');
            window.location.replace(UP_LOGIN_PAGE);
            return;
        }

        if (!userResponse.ok) {
            throw new Error('Could not load account (' + userResponse.status + ')');
        }

        const user = await userResponse.json();

        upRole = String(user.role || '').toLowerCase();
        upOriginalEmail = user.email_id || '';
        upUserId = user.id || '';
        upSetValue('up-email', upOriginalEmail);

        upProfilePath = upRole === 'teacher'
            ? '/api/v1/teachers/me'
            : '/api/v1/students/me';

        const profileResponse = await fetch(UP_API_BASE_URL + upProfilePath, {
            headers: upAuthHeaders(false)
        });

        if (!profileResponse.ok) {
            throw new Error('Could not load profile (' + profileResponse.status + ')');
        }

        const profile = await profileResponse.json();
        upOriginalProfile = profile;

        upSetValue('up-first-name', profile.first_name);
        upSetValue('up-last-name', profile.last_name);
        upSetValue('up-phone', profile.phone_no);
        upSetValue('up-gender', profile.gender);
        upSetValue('up-dob', profile.date_of_birth);
        upSetValue('up-address', profile.address);
        upSetValue('up-about', profile.about);

        const preview = document.getElementById('up-pic-preview');
        if (preview) preview.src = upPicUrl(profile.profile_pic);

        upShowMessage('', '');

    } catch (error) {
        console.error('Load error:', error);
        upShowMessage('Could not load your details. Please refresh the page.', 'error');
    } finally {
        upSetBusy(false);
    }
}


// ==========================================
// SAVE CHANGES
// ==========================================

async function upHandleSave(e) {

    e.preventDefault();

    if (upBusy) return;

    const firstName = upValue('up-first-name');
    const lastName = upValue('up-last-name');
    const phone = upValue('up-phone');
    const gender = document.getElementById('up-gender').value;
    const dob = document.getElementById('up-dob').value;
    const email = upValue('up-email');
    const password = document.getElementById('up-password').value;
    const confirmPassword = document.getElementById('up-confirm-password').value;

    if (!firstName || !lastName || !phone || !gender || !dob || !email) {
        upShowMessage('Please fill in all required fields.', 'error');
        return;
    }

    const emailChanged = email !== upOriginalEmail;
    const passwordChanged = password.length > 0;

    if (passwordChanged && password !== confirmPassword) {
        upShowMessage('Passwords do not match.', 'error');
        return;
    }

    upSetBusy(true);
    upShowMessage('Saving...', '');

    try {

        // STEP 1: শুধু যেগুলো বদলেছে সেগুলো পাঠানো
        const allFields = {
            first_name: firstName,
            last_name: lastName,
            phone_no: phone,
            gender: gender,
            date_of_birth: dob,
            address: upValue('up-address'),
            about: upValue('up-about')
        };

        const profileBody = {};
        for (const key in allFields) {
            if (allFields[key] !== String(upOriginalProfile[key] || '')) {
                profileBody[key] = allFields[key];
            }
        }

        if (Object.keys(profileBody).length > 0) {
            const profileResponse = await fetch(UP_API_BASE_URL + upProfilePath, {
                method: 'PATCH',
                headers: upAuthHeaders(true),
                body: JSON.stringify(profileBody)
            });

            const profileResult = await profileResponse.json().catch(() => ({}));

            if (!profileResponse.ok) {
                console.error('Profile update error:', profileResult);
                upShowMessage(upErrorText(profileResult, 'Profile update failed.'), 'error');
                return;
            }
        }

        // STEP 2: নতুন ছবি থাকলে upload
        const picInput = document.getElementById('up-pic-input');
        const newPic = picInput && picInput.files[0];

        if (newPic) {
            const picPath = upRole === 'teacher'
                ? '/api/v1/teachers/profile-pic/upload'
                : '/api/v1/students/profile-pic/upload';

            const picForm = new FormData();
            picForm.append('file', newPic);

            const picResponse = await fetch(UP_API_BASE_URL + picPath, {
                method: 'POST',
                headers: upAuthHeaders(false),
                body: picForm
            });

            if (!picResponse.ok) {
                const picResult = await picResponse.json().catch(() => ({}));
                upShowMessage('Profile saved, but picture upload failed: ' +
                    upErrorText(picResult, 'unknown error.'), 'error');
                return;
            }
        }

        // STEP 3: ইমেইল / পাসওয়ার্ড (সবার শেষে), ID দিয়ে
        if (emailChanged || passwordChanged) {

            const userBody = { email_id: email };

            if (passwordChanged) {
                userBody.hashed_password = password;
            }

            const userResponse = await upUpdateUserById(userBody);

            const userResult = await userResponse.json().catch(() => ({}));

            if (!userResponse.ok) {
                console.error('User update error:', userResult);
                upShowMessage(
                    'Profile saved, but email/password update failed: ' +
                    upErrorText(userResult, 'unknown error.'),
                    'error'
                );
                return;
            }

            if (passwordChanged) {
                const ok = await upRelogin(email, password);
                if (!ok) {
                    upClearSession();
                    alert('Account updated. Please login again.');
                    window.location.replace(UP_LOGIN_PAGE);
                    return;
                }
            } else {
                const check = await fetch(UP_API_BASE_URL + '/api/v1/users/me', {
                    headers: upAuthHeaders(false)
                });
                if (!check.ok) {
                    upClearSession();
                    alert('Email updated. Please login again with your new email.');
                    window.location.replace(UP_LOGIN_PAGE);
                    return;
                }
            }
        }

        upShowMessage('Profile updated.', 'success');

        setTimeout(upGoToSettings, 500);

    } catch (error) {
        console.error('Save error:', error);
        upShowMessage('Something went wrong. Please try again.', 'error');
    } finally {
        upSetBusy(false);
    }
}


// ==========================================
// DELETE ACCOUNT (ID দিয়ে)
// ==========================================

async function upHandleDelete() {

    if (upBusy) return;

    const sure = confirm(
        'Delete your account?\n\nYour profile and login will be permanently removed. This cannot be undone.'
    );

    if (!sure) return;

    upSetBusy(true);
    upShowMessage('Deleting account...', '');

    try {

        const response = await upDeleteUserById();

        if (response.status !== 204 && !response.ok) {
            const result = await response.json().catch(() => ({}));
            console.error('Delete error:', result);
            upShowMessage(upErrorText(result, 'Account could not be deleted.'), 'error');
            return;
        }

        upClearSession();
        alert('Your account has been deleted.');
        window.location.replace(UP_LOGIN_PAGE);

    } catch (error) {
        console.error('Delete error:', error);
        upShowMessage('Something went wrong. Please try again.', 'error');
    } finally {
        upSetBusy(false);
    }
}


// ==========================================
// AUTO START
// ==========================================

document.addEventListener('submit', function (e) {
    if (e.target && e.target.id === 'updateProfileForm') {
        upHandleSave(e);
    }
});

document.addEventListener('click', function (e) {
    if (e.target && e.target.closest && e.target.closest('#up-delete-btn')) {
        upHandleDelete();
    }
});

function upCheckForForm() {
    const form = document.getElementById('updateProfileForm');
    if (form && !form.dataset.loaded) {
        initUpdateProfile();
    }
}

new MutationObserver(upCheckForForm).observe(document.documentElement, {
    childList: true,
    subtree: true
});

document.addEventListener('DOMContentLoaded', upCheckForForm);

document.addEventListener('change', function (e) {
    if (!e.target || e.target.id !== 'up-pic-input') return;

    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/') || file.size > 2 * 1024 * 1024) {
        upShowMessage('Please choose an image under 2 MB.', 'error');
        e.target.value = '';
        return;
    }

    document.getElementById('up-pic-preview').src = URL.createObjectURL(file);
});