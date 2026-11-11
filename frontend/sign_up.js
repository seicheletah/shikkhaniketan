document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // CONFIG
    // ==========================================

    const API_BASE = 'http://127.0.0.1:8000/api/v1';

    const CREATE_URL = `${API_BASE}/users/`;               // create user + send email OTP
    const VERIFY_URL = `${API_BASE}/users/verify-email`;   // verify the email OTP
    const LOGIN_URL = `${API_BASE}/login`;                 // login (form-urlencoded)
    const NEXT_PAGE = 'create_account.html';               // profile details page

    // ==========================================
    // ELEMENTS
    // ==========================================

    const signupForm = document.getElementById('signupForm');
    const otpForm = document.getElementById('otpForm');
    const formTitle = document.getElementById('formTitle');
    const otpInfo = document.getElementById('otpInfo');
    const otpInput = document.getElementById('otp');
    const signupBtn = document.getElementById('signupBtn');
    const verifyBtn = document.getElementById('verifyBtn');

    if (!signupForm || !otpForm) return;

    // ==========================================
    // STATE (kept only in memory, the password is never saved)
    // ==========================================

    let pendingUserId = null;   // id returned when the account is created
    let otpVerified = false;    // true after the OTP is verified
    let userEmail = '';
    let userPassword = '';
    let userRole = '';

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

    async function postJson(url, body) {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await response.json().catch(() => ({}));
        return { ok: response.ok, status: response.status, data };
    }

    async function postLogin(username, password) {
        const body = new URLSearchParams();
        body.append('grant_type', 'password');
        body.append('username', username);
        body.append('password', password);
        body.append('scope', '');
        body.append('client_id', 'string');
        body.append('client_secret', 'string');

        const response = await fetch(LOGIN_URL, {
            method: 'POST',
            headers: { 'Accept': 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body
        });
        const data = await response.json().catch(() => ({}));
        return { ok: response.ok, status: response.status, data };
    }

    function setButton(button, disabled, text) {
        button.disabled = disabled;
        button.textContent = text;
    }

    // ==========================================
    // STEP 1: CREATE USER (the backend also sends the email OTP)
    // POST /users/  { email_id, role, hashed_password }
    // ==========================================

    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const role = document.getElementById('role').value;

        if (!email || !password || !role) {
            alert('Please fill in all fields');
            return;
        }

        setButton(signupBtn, true, 'Creating...');

        try {
            const result = await postJson(CREATE_URL, {
                email_id: email,
                role: role,
                hashed_password: password
            });

            console.log('Create user response:', result.status, result.data);

            if (!result.ok) {
                alert(getErrorMessage(result.data, 'Sign up failed (status ' + result.status + ').'));
                setButton(signupBtn, false, 'Continue');
                return;
            }

            pendingUserId = result.data.id;

            if (!pendingUserId) {
                alert('Account was created but no user id was returned.');
                setButton(signupBtn, false, 'Continue');
                return;
            }

            userEmail = email;
            userPassword = password;
            userRole = role;

            // Show the OTP form
            signupForm.hidden = true;
            otpForm.hidden = false;
            formTitle.textContent = 'VERIFY EMAIL';
            otpInfo.textContent = `We sent a verification code to ${userEmail}. Enter it below.`;
            otpInput.focus();

        } catch (error) {
            console.error('API Error:', error);
            alert('Unable to connect to the server. Please try again.');
            setButton(signupBtn, false, 'Continue');
        }
    });

    // ==========================================
    // STEP 2: VERIFY OTP -> LOGIN -> GO TO CREATE ACCOUNT PAGE
    // POST /users/verify-email  { user_id, code }
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

            // ---- Verify the OTP (skipped on retry if already verified) ----
            if (!otpVerified) {
                const verifyResult = await postJson(VERIFY_URL, {
                    user_id: pendingUserId,
                    code: code
                });

                console.log('Verify OTP response:', verifyResult.status, verifyResult.data);

                if (!verifyResult.ok) {
                    alert(getErrorMessage(verifyResult.data, 'Invalid or expired OTP.'));
                    setButton(verifyBtn, false, 'Verify OTP');
                    return;
                }

                otpVerified = true;
            }

            // ---- Login so the next page can create the profile ----
            const loginResult = await postLogin(userEmail, userPassword);

            console.log('Login response:', loginResult.status, loginResult.data);

            if (!loginResult.ok || !loginResult.data.access_token) {
                alert(getErrorMessage(loginResult.data, 'Login failed. Please try again.'));
                setButton(verifyBtn, false, 'Verify OTP');
                return;
            }

            localStorage.setItem('access_token', loginResult.data.access_token);
            localStorage.setItem('token_type', loginResult.data.token_type || 'bearer');
            localStorage.setItem('userRole', loginResult.data.role || userRole);
            localStorage.setItem('role', loginResult.data.role || userRole);

            // ---- Open the Create Account (profile) page ----
            window.location.replace(NEXT_PAGE);

        } catch (error) {
            console.error('API Error:', error);
            alert('Something went wrong. Please try again.');
            setButton(verifyBtn, false, 'Verify OTP');
        }
    });

});