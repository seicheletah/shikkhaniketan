document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // CONFIG
    // ==========================================

    const API_BASE = 'http://127.0.0.1:8000/api/v1';

    // Email of the pre-created seed admin (ask the backend developer if it changes)
    const SEED_ADMIN_EMAIL = 'testadmin2@test.com';

    // API endpoints and redirect page for each role
    const ROLE_CONFIG = {
        student: {
            createUrl: `${API_BASE}/users/`,
            verifyUrl: `${API_BASE}/users/verify-email`,
            loginUrl: `${API_BASE}/login`,
            profileUrl: `${API_BASE}/students/`,
            picUploadUrl: `${API_BASE}/students/profile-pic/upload`,
            redirectPage: 'student.html'
        },
        teacher: {
            createUrl: `${API_BASE}/users/`,
            verifyUrl: `${API_BASE}/users/verify-email`,
            loginUrl: `${API_BASE}/login`,
            profileUrl: `${API_BASE}/teachers/`,
            picUploadUrl: `${API_BASE}/teachers/profile-pic/upload`,
            redirectPage: 'teacher.html'
        },
        admin: {
            createUrl: `${API_BASE}/admin/`,
            verifyUrl: `${API_BASE}/admin/verify-email`,
            loginUrl: `${API_BASE}/login-admin`,
            generateTokenUrl: `${API_BASE}/admin/generate-access-token`,
            verifyTokenUrl: `${API_BASE}/admin/verify-token`,
            profileUrl: null,          // admin has no separate profile endpoint
            picUploadUrl: null,
            redirectPage: 'admin.html'
        }
    };

    // ==========================================
    // ELEMENTS
    // ==========================================

    const profileForm = document.getElementById('profileForm');
    const otpForm = document.getElementById('otpForm');
    const formTitle = document.getElementById('formTitle');
    const otpInfo = document.getElementById('otpInfo');
    const otpInput = document.getElementById('otp');
    const continueBtn = document.getElementById('continueBtn');
    const verifyBtn = document.getElementById('verifyBtn');

    const firstNameInput = document.getElementById('first-name');
    const lastNameInput = document.getElementById('last-name');
    const phoneInput = document.getElementById('phone');
    const genderSelect = document.getElementById('gender');
    const dobInput = document.getElementById('dob');
    const addressInput = document.getElementById('address');
    const aboutInput = document.getElementById('about');
    const picInput = document.getElementById('profile-pic');
    const picPreview = document.getElementById('pic-preview');
    const seedGroup = document.getElementById('seedGroup');
    const seedInput = document.getElementById('seed-password');

    if (!profileForm || !otpForm) {
        console.error('Required forms not found.');
        return;
    }

    // ==========================================
    // SIGNUP DATA FROM THE PREVIOUS PAGE
    // ==========================================

    const email = localStorage.getItem('signupEmail');
    const password = localStorage.getItem('signupPassword');
    const role = (localStorage.getItem('signupRole') || '').toLowerCase();
    const config = ROLE_CONFIG[role];

    if (!email || !password || !config) {
        alert('Signup information not found. Please sign up again.');
        window.location.replace('sign_up.html');
        return;
    }

    // ==========================================
    // STATE (lets the user retry without repeating finished steps)
    // ==========================================

    let pendingUserId = null;      // id returned when the account is created
    let otpVerified = false;       // true after the email OTP is verified
    let accessToken = null;        // login token of the new user
    let profileCreated = false;    // true after the student/teacher profile is saved
    let seedToken = null;          // admin only: token of the seed admin
    let adminApproved = false;     // admin only: true after generate + verify token

    // ==========================================
    // ADMIN LAYOUT
    // Only first name, last name and seed password are needed
    // ==========================================

    if (role === 'admin') {

        // Hide the student / teacher only fields
        document.querySelectorAll('.profile-only').forEach((group) => {
            group.hidden = true;
            // Hidden required fields would block form submit, so remove them
            group.querySelectorAll('[required]').forEach((el) => el.removeAttribute('required'));
        });

        // Show the seed password field
        seedGroup.hidden = false;
        seedInput.required = true;
    }

    // ==========================================
    // HELPERS
    // ==========================================

    // Build a readable error message from an API response
    function getErrorMessage(data, fallback) {
        if (data && typeof data.detail === 'string') return data.detail;
        if (data && Array.isArray(data.detail) && data.detail[0] && data.detail[0].msg) {
            return data.detail[0].msg;
        }
        return fallback;
    }

    // POST request (JSON body is optional) and return { ok, data }
    async function postJson(url, body, token) {
        const headers = { 'Accept': 'application/json' };

        if (body !== null && body !== undefined) {
            headers['Content-Type'] = 'application/json';
        }

        if (token) headers['Authorization'] = 'Bearer ' + token;

        const response = await fetch(url, {
            method: 'POST',
            headers,
            ...(body !== null && body !== undefined ? { body: JSON.stringify(body) } : {})
        });

        const data = await response.json().catch(() => ({}));
        return { ok: response.ok, data };
    }

    // Login with the form-urlencoded endpoint and return { ok, data }
    async function postLogin(url, username, pass) {
        const loginBody = new URLSearchParams();
        loginBody.append('grant_type', 'password');
        loginBody.append('username', username);
        loginBody.append('password', pass);
        loginBody.append('scope', '');
        loginBody.append('client_id', 'string');
        loginBody.append('client_secret', 'string');

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: loginBody
        });

        const data = await response.json().catch(() => ({}));
        return { ok: response.ok, data };
    }

    // Enable / disable a button and change its text
    function setButton(button, disabled, text) {
        button.disabled = disabled;
        button.textContent = text;
    }

    // Switch the card from the details form to the OTP form
    function showOtpStep() {
        profileForm.hidden = true;
        otpForm.hidden = false;
        formTitle.textContent = 'VERIFY EMAIL';
        otpInfo.textContent = `We sent a verification code to ${email}. Enter it below.`;
        otpInput.focus();
    }

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
    // STEP 1: CREATE ACCOUNT (this also sends the email OTP)
    // ==========================================

    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Check required fields
        if (!firstNameInput.value.trim() || !lastNameInput.value.trim()) {
            alert('Please fill in all required fields.');
            return;
        }

        if (role === 'admin') {
            if (!seedInput.value) {
                alert('Please enter the seed admin password.');
                return;
            }
        } else if (!phoneInput.value.trim() || !genderSelect.value || !dobInput.value) {
            alert('Please fill in all required fields.');
            return;
        }

        setButton(continueBtn, true, 'Please wait...');

        try {

            // ---- Admin only: login as the seed admin first ----
            if (role === 'admin') {
                const seedLogin = await postLogin(config.loginUrl, SEED_ADMIN_EMAIL, seedInput.value);

                if (!seedLogin.ok || !seedLogin.data.access_token) {
                    console.error('Seed admin login error:', seedLogin.data);
                    alert(getErrorMessage(seedLogin.data, 'Seed admin password is incorrect.'));
                    setButton(continueBtn, false, 'Continue');
                    return;
                }

                seedToken = seedLogin.data.access_token;
            }

            // ---- Create the account ----
            // Body is different for admin and for student / teacher
            let payload;

            if (role === 'admin') {
                payload = {
                    first_name: firstNameInput.value.trim(),
                    last_name: lastNameInput.value.trim(),
                    email_id: email,
                    role: 'admin',
                    hashed_password: password
                };
            } else {
                payload = {
                    email_id: email,
                    role: role,
                    hashed_password: password
                };
            }

            const result = await postJson(config.createUrl, payload);

            if (!result.ok) {
                console.error('Account creation error:', result.data);
                alert(getErrorMessage(result.data, 'Account creation failed.'));
                setButton(continueBtn, false, 'Continue');
                return;
            }

            pendingUserId = result.data.id;

            if (!pendingUserId) {
                alert('Account was created but no user id was returned.');
                setButton(continueBtn, false, 'Continue');
                return;
            }

            // Ask for the OTP
            showOtpStep();

        } catch (error) {
            console.error('API Error:', error);
            alert('Unable to connect to the server. Please try again.');
            setButton(continueBtn, false, 'Continue');
        }
    });

    // ==========================================
    // STEP 2: VERIFY OTP -> (ADMIN APPROVAL) -> LOGIN -> PROFILE -> REDIRECT
    // ==========================================

    otpForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const code = otpInput.value.trim();

        if (!code) {
            alert('Please enter the OTP.');
            return;
        }

        setButton(verifyBtn, true, 'Verifying...');

        try {

            // ---- Verify the email OTP ----
            if (!otpVerified) {
                const verifyResult = await postJson(config.verifyUrl, {
                    user_id: pendingUserId,
                    code: code
                });

                if (!verifyResult.ok) {
                    console.error('OTP verification error:', verifyResult.data);
                    alert(getErrorMessage(verifyResult.data, 'Invalid or expired OTP.'));
                    setButton(verifyBtn, false, 'Verify & Finish');
                    return;
                }

                otpVerified = true;
            }

            // ---- Admin only: approve the new admin with the seed admin token ----
            if (role === 'admin' && !adminApproved) {

                // Generate an access token using the seed admin token
                const generated = await postJson(config.generateTokenUrl, null, seedToken);

                if (!generated.ok || !generated.data.token) {
                    console.error('Generate token error:', generated.data);
                    alert(getErrorMessage(generated.data, 'Access token was not generated.'));
                    setButton(verifyBtn, false, 'Verify & Finish');
                    return;
                }

                // Verify the generated token for the new admin
                const tokenResult = await postJson(config.verifyTokenUrl, {
                    user_id: pendingUserId,
                    token: generated.data.token
                });

                if (!tokenResult.ok) {
                    console.error('Verify token error:', tokenResult.data);
                    alert(getErrorMessage(tokenResult.data, 'Admin token verification failed.'));
                    setButton(verifyBtn, false, 'Verify & Finish');
                    return;
                }

                adminApproved = true;
            }

            // ---- Login to get the access token of the new user ----
            if (!accessToken) {
                const loginResult = await postLogin(config.loginUrl, email, password);

                if (!loginResult.ok || !loginResult.data.access_token) {
                    console.error('Login error:', loginResult.data);
                    alert(getErrorMessage(loginResult.data, 'Login failed. Please try again.'));
                    setButton(verifyBtn, false, 'Verify & Finish');
                    return;
                }

                accessToken = loginResult.data.access_token;

                // Save token and role
                localStorage.setItem('access_token', accessToken);
                localStorage.setItem('token_type', loginResult.data.token_type || 'bearer');
                localStorage.setItem('userRole', loginResult.data.role || role);
                localStorage.setItem('role', loginResult.data.role || role);
            }

            // ---- Student / Teacher: create the profile ----
            if (role !== 'admin' && !profileCreated) {

                const profileData = {
                    first_name: firstNameInput.value.trim(),
                    last_name: lastNameInput.value.trim(),
                    phone_no: phoneInput.value.trim(),
                    gender: genderSelect.value,
                    date_of_birth: dobInput.value,
                    address: addressInput.value.trim(),
                    about: aboutInput.value.trim()
                };

                const profileResult = await postJson(config.profileUrl, profileData, accessToken);

                if (!profileResult.ok) {
                    console.error('Profile creation error:', profileResult.data);
                    alert(getErrorMessage(profileResult.data, 'Profile creation failed. Please press the button again to retry.'));
                    setButton(verifyBtn, false, 'Verify & Finish');
                    return;
                }

                profileCreated = true;

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
            }

            // ---- Remove the temporary signup data ----
            localStorage.removeItem('signupEmail');
            localStorage.removeItem('signupPassword');
            localStorage.removeItem('signupRole');

            // ---- Open the dashboard (admin.html / student.html / teacher.html) ----
            window.location.replace(config.redirectPage);

        } catch (error) {
            console.error('API Error:', error);
            alert('Something went wrong. Please try again.');
            setButton(verifyBtn, false, 'Verify & Finish');
        }
    });

});