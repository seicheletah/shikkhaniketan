document.addEventListener('DOMContentLoaded', () => {

    const form = document.getElementById('profileForm');

    const firstNameInput = document.getElementById('first-name');
    const lastNameInput = document.getElementById('last-name');
    const phoneInput = document.getElementById('phone');
    const genderSelect = document.getElementById('gender');
    const dobInput = document.getElementById('dob');
    const addressInput = document.getElementById('address');
    const aboutInput = document.getElementById('about');
    const profilePhotoInput = document.getElementById('profile-photo');


    form.addEventListener('submit', async function (e) {

        e.preventDefault();


        // ==========================================
        // 1. CHECK REQUIRED PROFILE INFORMATION
        // ==========================================

        if (
            !firstNameInput.value.trim() ||
            !lastNameInput.value.trim() ||
            !phoneInput.value.trim() ||
            !genderSelect.value ||
            !dobInput.value
        ) {
            alert('Please fill in all required fields.');
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
                        'Content-Type':
                            'application/x-www-form-urlencoded'
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
            // STEP 3: GET ACCESS TOKEN
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
            // STEP 4: FORMAT GENDER
            // ==========================================

            let genderValue = genderSelect.value;

            if (genderValue === 'male') {
                genderValue = 'm';
            }

            if (genderValue === 'female') {
                genderValue = 'f';
            }

            if (genderValue === 'other') {
                genderValue = 'o';
            }


            // ==========================================
            // STEP 5: SELECT PROFILE API
            // ==========================================

            let profileUrl;
            let uploadUrl;

            const normalizedRole = role.toLowerCase();


            if (normalizedRole === 'student') {

                profileUrl =
                    'http://127.0.0.1:8000/api/v1/students/';

                uploadUrl =
                    'http://127.0.0.1:8000/api/v1/students/profile-pic/upload';

            } else if (normalizedRole === 'teacher') {

                profileUrl =
                    'http://127.0.0.1:8000/api/v1/teachers/';

                uploadUrl =
                    'http://127.0.0.1:8000/api/v1/teachers/profile-pic/upload';

            } else {

                alert('Invalid role: ' + role);
                return;
            }


            // ==========================================
            // STEP 6: CREATE PROFILE
            // ==========================================

            // IMPORTANT:
            // profile_photo is NOT included here.
            // Image will be uploaded separately.

            const profileData = {
                first_name: firstNameInput.value.trim(),
                last_name: lastNameInput.value.trim(),
                phone_no: phoneInput.value.trim(),
                gender: genderValue,
                date_of_birth: dobInput.value,
                address: addressInput.value.trim() || "",
                about: aboutInput.value.trim() || ""
            };


            console.log("FINAL PROFILE DATA:", profileData);
            console.log("Creating profile at:", profileUrl);


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


            if (!profileResponse.ok) {

                alert(
                    'Account created, but profile creation failed: ' +
                    JSON.stringify(profileResult)
                );

                return;
            }


            console.log("Profile created successfully.");


            // ==========================================
            // STEP 7: UPLOAD PROFILE PHOTO
            // ==========================================

            const selectedFile =
                profilePhotoInput.files[0];


            if (selectedFile) {

                console.log(
                    "Profile photo selected:",
                    selectedFile.name
                );


                const formData = new FormData();

                // Backend expects field name: "file"
                formData.append('file', selectedFile);


                console.log(
                    "Uploading profile photo to:",
                    uploadUrl
                );


                const uploadResponse = await fetch(
                    uploadUrl,
                    {
                        method: 'POST',
                        headers: {
                            'Authorization':
                                'Bearer ' + accessToken
                        },
                        body: formData
                    }
                );


                const uploadResult =
                    await uploadResponse.json();


                console.log(
                    "Profile photo upload response:",
                    uploadResult
                );


                if (!uploadResponse.ok) {

                    alert(
                        'Profile created, but profile photo upload failed: ' +
                        JSON.stringify(uploadResult)
                    );

                    return;
                }


                console.log(
                    "Profile photo uploaded successfully."
                );

            } else {

                console.log(
                    "No profile photo selected."
                );
            }


            // ==========================================
            // STEP 8: SUCCESS
            // ==========================================

            alert(
                'Account, profile and profile photo created successfully!'
            );


            // Remove temporary signup information

            localStorage.removeItem('signupEmail');
            localStorage.removeItem('signupPassword');
            localStorage.removeItem('signupRole');


            // ==========================================
            // STEP 9: GO TO PROFILE PAGE
            // ==========================================

            if (normalizedRole === 'student') {

                window.location.href = 'student.html';

            } else if (normalizedRole === 'teacher') {

                window.location.href = 'teacher.html';
            }


        } catch (error) {

            console.error("API Error:", error);

            alert(
                'API Error: ' +
                error.message
            );
        }

    });

});