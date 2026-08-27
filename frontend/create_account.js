document.addEventListener('DOMContentLoaded', () => {

    const form = document.getElementById('profileForm');

    const firstNameInput = document.getElementById('first-name');
    const lastNameInput = document.getElementById('last-name');
    const phoneInput = document.getElementById('phone');
    const genderSelect = document.getElementById('gender');
    const dobInput = document.getElementById('dob');

    form.addEventListener('submit', async function (e) {

        e.preventDefault();

        alert("Done button clicked!");

        // সব field check
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

        // Signup page থেকে data নেওয়া
        const email = localStorage.getItem('signupEmail');
        const password = localStorage.getItem('signupPassword');
        const role = localStorage.getItem('signupRole');

        console.log("Signup data:", email, password, role);

        if (!email || !password || !role) {
            alert('Signup information not found. Please sign up again.');
            return;
        }

        const userData = {
            email_id: email,
            role: role,
            hashed_password: password
        };

        console.log("Sending API data:", userData);

        try {

            alert("API call হচ্ছে...");

            const response = await fetch(
                'http://127.0.0.1:8000/api/v1/users/',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(userData)
                }
            );

            console.log("Response status:", response.status);

            const data = await response.json();

            console.log("API response:", data);

            if (response.ok) {

                alert('Account created successfully!');

                localStorage.removeItem('signupEmail');
                localStorage.removeItem('signupPassword');
                localStorage.removeItem('signupRole');

                window.location.href = 'login.html';

            } else {

                alert(
                    'Account creation failed: ' +
                    JSON.stringify(data)
                );
            }

        } catch (error) {

            console.error("API Error:", error);

            alert(
                'API Error: ' + error.message
            );
        }

    });

});