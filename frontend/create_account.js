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

    // Check whether form exists
    if (!form) {
        console.error("Profile form not found!");
        return;
    }

    console.log("CREATE ACCOUNT JS LOADED");

    form.addEventListener('submit', async function (e) {

        e.preventDefault();

        console.log("DONE BUTTON CLICKED - FORM SUBMITTED");

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

            console.log("Creating user...");

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

            localStorage.setItem(
                'token_type',
                loginResult.token_type || 'bearer'
            );

            console.log("Access token received.");

            // ==========================================
            // STEP 3: FORMAT GENDER
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
            // STEP 4: CREATE PROFILE
            // IMPORTANT:
            // DO NOT SEND profile_pic HERE
            // ==========================================

            const profileData = {
                first_name: firstNameInput.value.trim(),
                last_name: lastNameInput.value.trim(),
                phone_no: phoneInput.value.trim(),
                gender: genderValue,
                date_of_birth: dobInput.value,
                address: addressInput.value.trim() || "",
                about: aboutInput.value.trim() || ""
            };

            console.log("Profile data:", profileData);

            // ==========================================
            // STEP 5: SELECT PROFILE API
            // ==========================================

            let profileUrl = "";

            const userRole = role.toLowerCase();

            if (userRole === 'student') {

                profileUrl =
                    'http://127.0.0.1:8000/api/v1/students/';

            } else if (userRole === 'teacher') {

                profileUrl =
                    'http://127.0.0.1:8000/api/v1/teachers/';

            } else {

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
                    'Profile creation failed: ' +
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
                    "Selected profile photo:",
                    selectedFile.name
                );

                const formData = new FormData();

                // IMPORTANT:
                // Backend expects the field name "file"
                formData.append(
                    'file',
                    selectedFile
                );

                let uploadUrl = "";

                if (userRole === 'student') {

                    uploadUrl =
                        'http://127.0.0.1:8000/api/v1/students/profile-pic/upload';

                } else if (userRole === 'teacher') {

                    uploadUrl =
                        'http://127.0.0.1:8000/api/v1/teachers/profile-pic/upload';
                }

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
                    "Photo upload response:",
                    uploadResult
                );

                if (!uploadResponse.ok) {

                    alert(
                        'Profile created, but photo upload failed: ' +
                        JSON.stringify(uploadResult)
                    );

                    return;
                }

                console.log(
                    "Profile photo uploaded successfully!"
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
                'Account and profile created successfully!'
            );

            // Remove temporary signup information

            localStorage.removeItem('signupEmail');
            localStorage.removeItem('signupPassword');
            localStorage.removeItem('signupRole');

            // ==========================================
            // STEP 9: GO TO PROFILE PAGE
            // ==========================================

            if (userRole === 'student') {

                window.location.href =
                    'student.html';

            } else if (userRole === 'teacher') {

                window.location.href =
                    'teacher.html';
            }

        } catch (error) {

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