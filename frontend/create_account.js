document.addEventListener('DOMContentLoaded', () => {

    const form = document.getElementById('profileForm');

    const firstNameInput = document.getElementById('first-name');
    const lastNameInput = document.getElementById('last-name');
    const phoneInput = document.getElementById('phone');
    const genderSelect = document.getElementById('gender');
    const dobInput = document.getElementById('dob');


    form.addEventListener('submit', async function (e) {

        e.preventDefault();


        // ==========================================
        // 1. CHECK PROFILE INFORMATION
        // ==========================================

        if (
            !firstNameInput.value.trim() ||
            !lastNameInput.value.trim() ||
            !phoneInput.value.trim() ||
            !genderSelect.value ||
            !dobInput.value
        ) {
            alert('Please fill in all fields');
            return;
        }


        // ==========================================
        // 2. GET SIGNUP INFORMATION
        // ==========================================

        const email = localStorage.getItem('signupEmail');
        const password = localStorage.getItem('signupPassword');
        const role = localStorage.getItem('signupRole');


        console.log("Signup data:", {
            email: email,
            password: password,
            role: role
        });


        if (!email || !password || !role) {

            alert('Signup information not found. Please sign up again.');
            return;

        }


        try {

            // ==========================================
            // STEP 1: CREATE USER ACCOUNT
            // ==========================================

            const userData = {
                email_id: email,
                role: role,
                hashed_password: password
            };


            console.log("Creating user:", userData);


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


            console.log("User API response:", userResult);


            if (!userResponse.ok) {

                alert(
                    'Account creation failed: ' +
                    JSON.stringify(userResult)
                );

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


            console.log("Logging in...");


            const loginResponse = await fetch(
                'http://127.0.0.1:8000/api/v1/login',
                {
                    method: 'POST',

                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },

                    body: loginBody
                }
            );


            const loginResult = await loginResponse.json();


            console.log("Login API response:", loginResult);


            if (!loginResponse.ok) {

                alert(
                    'Login failed: ' +
                    JSON.stringify(loginResult)
                );

                return;
            }


            // ==========================================
            // GET ACCESS TOKEN
            // ==========================================

            const accessToken = loginResult.access_token;


            if (!accessToken) {

                alert('Access token not received.');
                return;

            }


            localStorage.setItem(
                'access_token',
                accessToken
            );


            console.log("Access token received.");


            // ==========================================
            // STEP 3: GET GENDER
            // ==========================================

            let genderValue = genderSelect.value;


            /*
             * Backend only accepts ONE character:
             *
             * Male   = m
             * Female = f
             * Other  = o
             */

            if (genderValue === 'male') {
                genderValue = 'm';
            }

            if (genderValue === 'female') {
                genderValue = 'f';
            }

            if (genderValue === 'other') {
                genderValue = 'o';
            }


            console.log("FINAL GENDER:", genderValue);


            // ==========================================
            // STEP 4: CREATE PROFILE DATA
            // ==========================================

            const profileData = {

                first_name: firstNameInput.value.trim(),

                last_name: lastNameInput.value.trim(),

                phone_no: phoneInput.value.trim(),

                gender: genderValue,

                date_of_birth: dobInput.value,

                address: "",

                about: "",

                profile_photo: ""

            };


            console.log(
                "FINAL PROFILE DATA:",
                profileData
            );


            // ==========================================
            // STEP 5: SELECT PROFILE API
            // ==========================================

            let profileUrl;


            if (role.toLowerCase() === 'student') {

                profileUrl =
                    'http://127.0.0.1:8000/api/v1/students/';

            }

            else if (role.toLowerCase() === 'teacher') {

                profileUrl =
                    'http://127.0.0.1:8000/api/v1/teachers/';

            }

            else {

                alert('Invalid role: ' + role);
                return;

            }


            console.log(
                "Creating profile at:",
                profileUrl
            );


            // ==========================================
            // STEP 6: CREATE STUDENT / TEACHER PROFILE
            // ==========================================

            const profileResponse = await fetch(
                profileUrl,
                {
                    method: 'POST',

                    headers: {

                        'accept': 'application/json',

                        'Content-Type': 'application/json',

                        'Authorization':
                            'Bearer ' + accessToken

                    },

                    body: JSON.stringify(profileData)
                }
            );


            const profileResult =
                await profileResponse.json();


            console.log(
                "Profile API response:",
                profileResult
            );


            // ==========================================
            // STEP 7: CHECK PROFILE CREATION
            // ==========================================

            if (!profileResponse.ok) {

                alert(
                    'Account created, but profile creation failed: ' +
                    JSON.stringify(profileResult)
                );

                return;

            }


            // ==========================================
            // SUCCESS
            // ==========================================

            alert(
                'Account and profile created successfully!'
            );


            // Remove temporary signup information

            localStorage.removeItem('signupEmail');

            localStorage.removeItem('signupPassword');

            localStorage.removeItem('signupRole');


            // ==========================================
            // GO TO PROFILE PAGE
            // ==========================================

            if (role.toLowerCase() === 'student') {

                window.location.href =
                    'student.html';

            }

            else if (role.toLowerCase() === 'teacher') {

                window.location.href =
                    'teacher.html';

            }

        }

        catch (error) {

            console.error(
                "API Error:",
                error
            );


            alert(
                'API Error: ' +
                error.message
            );

        }

    });

});