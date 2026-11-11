document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // CONFIG
    // ==========================================

    const API_BASE = 'http://127.0.0.1:8000/api/v1';

    const CREATE_URL = `${API_BASE}/admin/`;                      // create admin + send email OTP
    const VERIFY_EMAIL_URL = `${API_BASE}/admin/verify-email`;    // verify the email OTP
    const VERIFY_TOKEN_URL = `${API_BASE}/admin/verify-token`;    // verify the admin access token
    const LOGIN_URL = `${API_BASE}/login-admin`;                  // admin login (form-urlencoded)
    const REDIRECT_PAGE = 'admin.html';

    // ==========================================
    // ELEMENTS
    // ==========================================

    const adminForm = document.getElementById('adminForm');
    const otpForm = document.getElementById('otpForm');
    const tokenForm = document.getElementById('tokenForm');
    const formTitle = document.getElementById('formTitle');
    const otpInfo = document.getElementById('otpInfo');
    const otpInput = document.getElementById('otp');
    const tokenInput = document.getElementById('access-token');
    const createBtn = document.getElementById('createBtn');
    const verifyBtn = document.getElementById('verifyBtn');
    const tokenBtn = document.getElementById('tokenBtn');

    const firstNameInput = document.getElementById('first-name');
    const lastNameInput = document.getElementById('last-name');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');

    if (!adminForm || !otpForm || !tokenForm) {
        console.error('Required forms not found.');
        return;
    }

    // ==========================================
    // STATE (lets the user retry without repeating finished steps)
    // The password stays only in memory, it is never saved in localStorage.
    // ==========================================

    let pendingUserId = null;   // id returned when the admin account is created
    let otpVerified = false;    // true after the email OTP is verified
    let tokenVerified = false;  // true after the access token is verified
    let adminEmail = '';        // email used for this signup
    let adminPassword = '';     // password used for this signup (memory only)

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

    // POST a JSON body and return { ok, status, data }
    async function postJson(url, body) {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        const data = await response.json().catch(() => ({}));
        return { ok: response.ok, status: response.status, data };
    }

    // Admin login (form-urlencoded) and return { ok, status, data }
    async function postLogin(username, password) {
        const loginBody = new URLSearchParams();
        loginBody.append('grant_type', 'password');
        loginBody.append('username', username);
        loginBody.append('password', password);
        loginBody.append('scope', '');
        loginBody.append('client_id', 'string');
        loginBody.append('client_secret', 'string');

        const response = await fetch(LOGIN_URL, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: loginBody
        });

        const data = await response.json().catch(() => ({}));
        return { ok: response.ok, status: response.status, data };
    }

    // Enable / disable a button and change its text
    function setButton(button, disabled, text) {
        button.disabled = disabled;
        button.textContent = text;
    }

    // Show the OTP step
    function showOtpStep() {
        adminForm.hidden = true;
        tokenForm.hidden = true;
        otpForm.hidden = false;
        formTitle.textContent = 'VERIFY EMAIL';
        otpInfo.textContent = `We sent a verification code to ${adminEmail}. Enter it below. (Check your spam folder too.)`;
        otpInput.focus();
    }

    // Show the access token step
    function showTokenStep() {
        adminForm.hidden = true;
        otpForm.hidden = true;
        tokenForm.hidden = false;
        formTitle.textContent = 'ACCESS TOKEN';
        tokenInput.focus();
    }

    // Login, save the session and open the admin dashboard
    async function loginAndRedirect(activeButton, idleText) {
        const loginResult = await postLogin(adminEmail, adminPassword);
        console.log('Login response:', loginResult.status, loginResult.data);

        if (!loginResult.ok || !loginResult.data.access_token) {
            alert(getErrorMessage(loginResult.data, 'Login failed. Please try again.'));
            setButton(activeButton, false, idleText);
            return;
        }

        // Save token and role (same keys as login.js)
        localStorage.setItem('access_token', loginResult.data.access_token);
        localStorage.setItem('token_type', loginResult.data.token_type || 'bearer');
        localStorage.setItem('userRole', loginResult.data.role || 'admin');
        localStorage.setItem('role', loginResult.data.role || 'admin');

        // Open the admin dashboard
        window.location.replace(REDIRECT_PAGE);
    }

    // ==========================================
    // STEP 1: CREATE ADMIN (the backend also sends the email OTP)
    // POST /admin/  { first_name, last_name, email_id, role, hashed_password }
    // ==========================================

    adminForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const firstName = firstNameInput.value.trim();
        const lastName = lastNameInput.value.trim();
        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (!firstName || !lastName || !email || !password) {
            alert('Please fill in all fields.');
            return;
        }

        setButton(createBtn, true, 'Creating...');

        try {
            const result = await postJson(CREATE_URL, {
                first_name: firstName,
                last_name: lastName,
                email_id: email,
                role: 'admin',
                hashed_password: password
            });

            // Open browser DevTools -> Console to see exactly what the backend answered
            console.log('Create admin response:', result.status, result.data);

            if (!result.ok) {
                alert(getErrorMessage(result.data, 'Account creation failed (status ' + result.status + ').'));
                setButton(createBtn, false, 'Continue');
                return;
            }

            pendingUserId = result.data.id;

            if (!pendingUserId) {
                alert('Account was created but no user id was returned.');
                setButton(createBtn, false, 'Continue');
                return;
            }

            // Remember the credentials (memory only) for the login step
            adminEmail = email;
            adminPassword = password;

            showOtpStep();

        } catch (error) {
            console.error('API Error:', error);
            alert('Unable to connect to the server. Please try again.');
            setButton(createBtn, false, 'Continue');
        }
    });

    // ==========================================
    // STEP 2: VERIFY EMAIL OTP
    // POST /admin/verify-email  { user_id, code }
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
            const verifyResult = await postJson(VERIFY_EMAIL_URL, {
                user_id: pendingUserId,
                code: code
            });

            console.log('Verify email response:', verifyResult.status, verifyResult.data);

            if (!verifyResult.ok) {
                alert(getErrorMessage(verifyResult.data, 'Invalid or expired OTP.'));
                setButton(verifyBtn, false, 'Verify OTP');
                return;
            }

            otpVerified = true;
            setButton(verifyBtn, false, 'Verify OTP');

            // Go to the access token step
            showTokenStep();

        } catch (error) {
            console.error('API Error:', error);
            alert('Something went wrong. Please try again.');
            setButton(verifyBtn, false, 'Verify OTP');
        }
    });

    // ==========================================
    // STEP 3: VERIFY ACCESS TOKEN -> LOGIN -> REDIRECT
    // POST /admin/verify-token  { user_id, token }
    // ==========================================

    tokenForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const token = tokenInput.value.trim();

        if (!token) {
            alert('Please enter the access token.');
            return;
        }

        setButton(tokenBtn, true, 'Verifying...');

        try {

            // ---- Verify the access token (skipped if it was already verified) ----
            if (!tokenVerified) {
                const tokenResult = await postJson(VERIFY_TOKEN_URL, {
                    user_id: pendingUserId,
                    token: token
                });

                console.log('Verify token response:', tokenResult.status, tokenResult.data);

                if (!tokenResult.ok) {
                    alert(getErrorMessage(tokenResult.data, 'Invalid or expired access token.'));
                    setButton(tokenBtn, false, 'Verify Token & Finish');
                    return;
                }

                tokenVerified = true;
            }

            // ---- Login, save the session and open the dashboard ----
            await loginAndRedirect(tokenBtn, 'Verify Token & Finish');

        } catch (error) {
            console.error('API Error:', error);
            alert('Something went wrong. Please try again.');
            setButton(tokenBtn, false, 'Verify Token & Finish');
        }
    });

});