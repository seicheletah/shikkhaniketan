document.addEventListener('DOMContentLoaded', () => {

    const form = document.getElementById('profileForm');

    if (!form) {
        console.error('Profile form not found.');
        return;
    }

    const firstNameInput = document.getElementById('first-name');
    const lastNameInput = document.getElementById('last-name');
    const phoneInput = document.getElementById('phone');
    const genderSelect = document.getElementById('gender');
    const dobInput = document.getElementById('dob');
    const addressInput = document.getElementById('address');
    const aboutInput = document.getElementById('about');

    let isSubmitting = false;


    // ==========================================
    // FORM SUBMIT
    // ==========================================

    form.addEventListener('submit', async function (e) {

        e.preventDefault();

        if (isSubmitting) {
            return;
        }

        isSubmitting = true;

        const submitButton = form.querySelector(
            'button[type="submit"]'
        );

        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = 'Creating...';
        }


        // ==========================================
        // CHECK REQUIRED FIELDS
        // ==========================================

        if (
            !firstNameInput.value.trim() ||
            !lastNameInput.value.trim() ||
            !phoneInput.value.trim() ||
            !genderSelect.value ||
            !dobInput.value
        ) {

            alert('Please fill in all required fields.');

            isSubmitting = false;

            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = 'Done';
            }

            return;
        }


        // ==========================================
        // GET SIGNUP INFORMATION
        // ==========================================

        const email = localStorage.getItem('signupEmail');
        const password = localStorage.getItem('signupPassword');
        const role = localStorage.getItem('signupRole');


        if (!email || !password || !role) {

            alert('Signup information not found. Please sign up again.');

            isSubmitting = false;

            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = 'Done';
            }

            return;
        }


        const normalizedRole = role.toLowerCase();


        try {

            // ==========================================
            // STEP 1: CREATE USER ACCOUNT
            // ==========================================

            const userData = {
                email_id: email,
                role: role,
                hashed_password: password
            };


            const userResponse = await fetch(
                'http://127.0.0.1:8000/api/v1/users/',
                {
                    method: 'POST',

                    headers: {
                        'Content-Type': 'application/json'
                    },

                    body: JSON.stringify(userData)
                }
            );


            const userResult = await userResponse.json();


            if (!userResponse.ok) {

                console.error(
                    'Account creation error:',
                    userResult
                );

                alert(
                    typeof userResult.detail === 'string'
                        ? userResult.detail
                        : 'Account creation failed.'
                );

                isSubmitting = false;

                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = 'Done';
                }

                return;
            }


            // ==========================================
            // STEP 2: LOGIN
            // ==========================================

            const loginBody = new URLSearchParams();

            loginBody.append('grant_type', 'password');
            loginBody.append('username', email);
            loginBody.append('password', password);
            loginBody.append('scope', '');
            loginBody.append('client_id', 'string');
            loginBody.append('client_secret', 'string');


            const loginResponse = await fetch(
                'http://127.0.0.1:8000/api/v1/login',
                {
                    method: 'POST',

                    headers: {
                        'Content-Type':
                            'application/x-www-form-urlencoded'
                    },

                    body: loginBody
                }
            );


            const loginResult =
                await loginResponse.json();


            if (!loginResponse.ok) {

                console.error(
                    'Login error:',
                    loginResult
                );

                alert('Login failed. Please try again.');

                isSubmitting = false;

                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = 'Done';
                }

                return;
            }


            // ==========================================
            // STEP 3: GET ACCESS TOKEN
            // ==========================================

            const accessToken =
                loginResult.access_token;


            if (!accessToken) {

                alert('Access token was not received.');

                isSubmitting = false;

                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = 'Done';
                }

                return;
            }


            // ==========================================
            // SAVE TOKEN
            // ==========================================

            localStorage.setItem(
                'access_token',
                accessToken
            );

            localStorage.setItem(
                'token_type',
                loginResult.token_type || 'bearer'
            );


            // ==========================================
            // STEP 4: SELECT ROLE
            // ==========================================

            let profileUrl;
            let redirectPage;


            if (normalizedRole === 'student') {

                profileUrl =
                    'http://127.0.0.1:8000/api/v1/students/';

                redirectPage = 'student.html';


            } else if (normalizedRole === 'teacher') {

                profileUrl =
                    'http://127.0.0.1:8000/api/v1/teachers/';

                redirectPage = 'teacher.html';


            } else {

                alert('Invalid role.');

                isSubmitting = false;

                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = 'Done';
                }

                return;
            }


            // ==========================================
            // STEP 5: CREATE PROFILE
            // ==========================================

            const profileData = {

                first_name:
                    firstNameInput.value.trim(),

                last_name:
                    lastNameInput.value.trim(),

                phone_no:
                    phoneInput.value.trim(),

                gender:
                    genderSelect.value,

                date_of_birth:
                    dobInput.value,

                address:
                    addressInput.value.trim(),

                about:
                    aboutInput.value.trim()
            };


            console.log('Creating profile:', profileData);


            const profileResponse = await fetch(
                profileUrl,
                {
                    method: 'POST',

                    headers: {
                        'Content-Type': 'application/json',

                        'Authorization':
                            'Bearer ' + accessToken
                    },

                    body:
                        JSON.stringify(profileData)
                }
            );


            const profileResult =
                await profileResponse.json();


            console.log(
                'Profile API response:',
                profileResult
            );


            if (!profileResponse.ok) {

                console.error(
                    'Profile creation error:',
                    profileResult
                );

                alert('Profile creation failed.');

                isSubmitting = false;

                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = 'Done';
                }

                return;
            }


            // ==========================================
            // PROFILE CREATED SUCCESSFULLY
            // ==========================================

            console.log('Profile created successfully.');


            // ==========================================
            // STEP 6: REMOVE SIGNUP DATA
            // ==========================================

            localStorage.removeItem('signupEmail');
            localStorage.removeItem('signupPassword');
            localStorage.removeItem('signupRole');


            // ==========================================
            // STEP 7: OPEN STUDENT / TEACHER PAGE
            // ==========================================

            window.location.replace(redirectPage);

        }


        // ==========================================
        // ERROR HANDLING
        // ==========================================

        catch (error) {

            console.error('API Error:', error);

            alert(
                'Something went wrong. Please try again.'
            );

            isSubmitting = false;

            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = 'Done';
            }
        }

    });

});