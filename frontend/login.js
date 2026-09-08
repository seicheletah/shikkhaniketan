document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // PASSWORD SHOW / HIDE
    // ==========================================

    const togglePassword =
        document.getElementById('togglePassword');

    const passwordInput =
        document.getElementById('password');

    if (togglePassword && passwordInput) {

        togglePassword.addEventListener('click', function () {

            const type =
                passwordInput.type === 'password'
                    ? 'text'
                    : 'password';

            passwordInput.type = type;

            this.classList.toggle('fa-eye');
            this.classList.toggle('fa-eye-slash');
        });
    }


    // ==========================================
    // ROLE SELECTION
    // ==========================================

    const roleButtons =
        document.querySelectorAll('.role-btn');

    let selectedRole = null;


    roleButtons.forEach(button => {

        button.addEventListener('click', function () {

            // Remove active class from all buttons
            roleButtons.forEach(btn => {
                btn.classList.remove('active');
            });

            // Add active class to selected button
            this.classList.add('active');

            // Get selected role
            selectedRole =
                this.getAttribute('data-role');

            console.log(
                'Selected Role:',
                selectedRole
            );
        });

    });


    // ==========================================
    // LOGIN FORM
    // ==========================================

    const loginForm =
        document.getElementById('loginForm');


    loginForm.addEventListener(
        'submit',
        async function (e) {

            e.preventDefault();


            const email =
                document.getElementById('email')
                    .value.trim();

            const password =
                document.getElementById('password')
                    .value;


            // ==========================================
            // CHECK EMAIL & PASSWORD
            // ==========================================

            if (!email || !password) {

                alert(
                    'Please fill in all fields.'
                );

                return;
            }


            // ==========================================
            // CHECK ROLE
            // ==========================================

            if (!selectedRole) {

                alert(
                    'Please select your role.'
                );

                return;
            }


            try {

                // ==========================================
                // LOGIN API
                // ==========================================

                const formData =
                    new URLSearchParams();

                formData.append(
                    'username',
                    email
                );

                formData.append(
                    'password',
                    password
                );


                const response =
                    await fetch(
                        'http://127.0.0.1:8000/api/v1/login',
                        {
                            method: 'POST',

                            headers: {
                                'Content-Type':
                                    'application/x-www-form-urlencoded'
                            },

                            body: formData
                        }
                    );


                const data =
                    await response.json();


                // ==========================================
                // LOGIN SUCCESS
                // ==========================================

                if (response.ok) {

                    console.log(
                        'Login Success:',
                        data
                    );


                    // Save token
                    localStorage.setItem(
                        'access_token',
                        data.access_token
                    );

                    localStorage.setItem(
                        'token_type',
                        data.token_type
                    );


                    // Save selected role
                    localStorage.setItem(
                        'userRole',
                        selectedRole
                    );


                    console.log(
                        'Selected role:',
                        selectedRole
                    );


                    alert(
                        'Login Successful!'
                    );


                    // ==========================================
                    // REDIRECT
                    // ==========================================

                    if (selectedRole === 'student') {

                        window.location.href =
                            'student.html';

                    } else if (
                        selectedRole === 'teacher'
                    ) {

                        window.location.href =
                            'teacher.html';

                    } else if (
                        selectedRole === 'admin'
                    ) {

                        // Jodi admin page thake
                        window.location.href =
                            'admin.html';

                    }

                } else {

                    alert(
                        data.detail ||
                        'Invalid email or password'
                    );
                }


            } catch (error) {

                console.error(
                    'Login Error:',
                    error
                );


                alert(
                    'Backend server-এর সাথে connection হচ্ছে না!'
                );
            }

        }
    );

});