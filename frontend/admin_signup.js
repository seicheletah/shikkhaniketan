/* ==========================================================
   admin_signup.js  -  ONE page for the whole admin entrance

   The page shows ONE form at a time:

     STEP 0  Admin LOGIN        (first screen)
        |  click "Sign up"
        v
     STEP 1  Admin SIGN UP      (first name, last name, email, password)
        v
     STEP 2  Email OTP
        v
     STEP 3  Admin access token  -> login -> admin dashboard

   "Log in" under the sign up form brings the visitor back to STEP 0.
   ========================================================== */
document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // CONFIG
    // All backend addresses are in ONE place.
    // ==========================================

    const API_BASE = 'http://127.0.0.1:8000/api/v1';

    const CREATE_URL = `${API_BASE}/admin/`;                      // create admin + send email OTP
    const VERIFY_EMAIL_URL = `${API_BASE}/admin/verify-email`;    // verify the email OTP
    const VERIFY_TOKEN_URL = `${API_BASE}/admin/verify-token`;    // verify the admin access token
    const LOGIN_URL = `${API_BASE}/login-admin`;                  // admin login (form-urlencoded)
    const REDIRECT_PAGE = 'admin.html';                           // the admin dashboard

    // ==========================================
    // ALREADY LOGGED IN AS ADMIN?
    // Then there is no need to show this page: open the dashboard directly.
    // ==========================================

    if (localStorage.getItem('access_token') && localStorage.getItem('userRole') === 'admin') {
        window.location.replace(REDIRECT_PAGE);
        return;
    }

    // ==========================================
    // ELEMENTS
    // We find every element ONCE here and use the variables below.
    // ==========================================

    // The five forms (only one is visible at a time)
    const loginForm = document.getElementById('adminLoginForm');   // STEP 0
    const adminForm = document.getElementById('adminForm');        // STEP 1
    const otpForm = document.getElementById('otpForm');            // STEP 2
    const tokenForm = document.getElementById('tokenForm');        // STEP 3

    // Title above the forms ("ADMIN LOGIN", "ADMIN SIGN UP", ...)
    const formTitle = document.getElementById('formTitle');

    // Login form (STEP 0)
    const loginEmailInput = document.getElementById('login-email');
    const loginPasswordInput = document.getElementById('login-password');
    const loginBtn = document.getElementById('loginBtn');
    const loginTogglePassword = document.getElementById('loginTogglePassword');

    // The two links that switch between login and sign up
    const showSignupLink = document.getElementById('showSignupLink');
    const showLoginLink = document.getElementById('showLoginLink');

    // Sign up form (STEP 1)
    const firstNameInput = document.getElementById('first-name');
    const lastNameInput = document.getElementById('last-name');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const createBtn = document.getElementById('createBtn');

    // OTP form (STEP 2)
    const otpInfo = document.getElementById('otpInfo');
    const otpInput = document.getElementById('otp');
    const verifyBtn = document.getElementById('verifyBtn');

    // Access token form (STEP 3)
    const tokenInput = document.getElementById('access-token');
    const tokenBtn = document.getElementById('tokenBtn');

    // If the HTML is missing a form, stop here and tell the developer
    if (!loginForm || !adminForm || !otpForm || !tokenForm) {
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

    // ==========================================
    // SHOW ONE FORM AT A TIME
    // Each function hides ALL forms first, then shows the one it needs.
    // ==========================================

    // Hide every form
    function hideAllForms() {
        loginForm.hidden = true;
        adminForm.hidden = true;
        otpForm.hidden = true;
        tokenForm.hidden = true;
    }

    // STEP 0: the admin login form
    function showLoginStep() {
        hideAllForms();
        loginForm.hidden = false;
        formTitle.textContent = 'ADMIN LOGIN';
        loginEmailInput.focus();
    }

    // STEP 1: the admin sign up form
    function showSignupStep() {
        hideAllForms();
        adminForm.hidden = false;
        formTitle.textContent = 'ADMIN SIGN UP';
        firstNameInput.focus();
    }

    // STEP 2: the email OTP form
    function showOtpStep() {
        hideAllForms();
        otpForm.hidden = false;
        formTitle.textContent = 'VERIFY EMAIL';
        otpInfo.textContent = `We sent a verification code to ${adminEmail}. Enter it below. (Check your spam folder too.)`;
        otpInput.focus();
    }

    // STEP 3: the access token form
    function showTokenStep() {
        hideAllForms();
        tokenForm.hidden = false;
        formTitle.textContent = 'ACCESS TOKEN';
        tokenInput.focus();
    }

    // ==========================================
    // SESSION + REDIRECT
    // Log in with the given email and password, save the session
    // and open the admin dashboard. Used by STEP 0 and STEP 3.
    // ==========================================

    async function loginAndRedirect(email, password, activeButton, idleText) {
        const loginResult = await postLogin(email, password);
        console.log('Login response:', loginResult.status, loginResult.data);

        // Wrong email / password, or no token came back
        if (!loginResult.ok || !loginResult.data.access_token) {
            alert(getErrorMessage(loginResult.data, 'Login failed. Please check your email and password.'));
            setButton(activeButton, false, idleText);
            return;
        }

        // Save token and role (same keys as login.js)
        localStorage.setItem('access_token', loginResult.data.access_token);
        localStorage.setItem('token_type', loginResult.data.token_type || 'bearer');
        localStorage.setItem('userRole', loginResult.data.role || 'admin');
        localStorage.setItem('role', loginResult.data.role || 'admin');

        // Open the admin dashboard (replace = Back button cannot return here)
        window.location.replace(REDIRECT_PAGE);
    }

    // ==========================================
    // STEP 0: ADMIN LOGIN
    // POST /login-admin  (form-urlencoded: username + password)
    // ==========================================

    // Show / hide the password with the eye icon
    if (loginTogglePassword) {
        loginTogglePassword.addEventListener('click', () => {
            if (loginPasswordInput.type === 'password') {
                loginPasswordInput.type = 'text';
                loginTogglePassword.classList.replace('fa-eye', 'fa-eye-slash');
            } else {
                loginPasswordInput.type = 'password';
                loginTogglePassword.classList.replace('fa-eye-slash', 'fa-eye');
            }
        });
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();   // stop the browser from reloading the page

        const email = loginEmailInput.value.trim();
        const password = loginPasswordInput.value;

        if (!email || !password) {
            alert('Please enter your email and password.');
            return;
        }

        setButton(loginBtn, true, 'Logging in...');

        try {
            await loginAndRedirect(email, password, loginBtn, 'Log In');
        } catch (error) {
            console.error('API Error:', error);
            alert('Unable to connect to the server. Please try again.');
            setButton(loginBtn, false, 'Log In');
        }
    });

    // ==========================================
    // SWITCH BETWEEN LOGIN AND SIGN UP
    // ==========================================

    // "Sign up" under the login form -> open the sign up form
    showSignupLink.addEventListener('click', (e) => {
        e.preventDefault();   // the link has href="#", do not jump to the top
        showSignupStep();
    });

    // "Log in" under the sign up form -> go back to the login form
    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        showLoginStep();
    });

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
            await loginAndRedirect(adminEmail, adminPassword, tokenBtn, 'Verify Token & Finish');

        } catch (error) {
            console.error('API Error:', error);
            alert('Something went wrong. Please try again.');
            setButton(tokenBtn, false, 'Verify Token & Finish');
        }
    });

});