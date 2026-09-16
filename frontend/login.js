
document.addEventListener('DOMContentLoaded', () => {

    const loginForm = document.getElementById('loginForm');
    const passwordInput = document.getElementById('password');
    const togglePassword = document.getElementById('togglePassword');

    // =========================
    // Password Show / Hide
    // =========================
    if (togglePassword && passwordInput) {

        togglePassword.addEventListener('click', () => {

            if (passwordInput.type === 'password') {

                passwordInput.type = 'text';

                togglePassword.classList.remove('fa-eye');
                togglePassword.classList.add('fa-eye-slash');

            } else {

                passwordInput.type = 'password';

                togglePassword.classList.remove('fa-eye-slash');
                togglePassword.classList.add('fa-eye');
            }
        });
    }


    // =========================
    // Login Form
    // =========================
    if (!loginForm) {
        console.error('Login form not found.');
        return;
    }


    loginForm.addEventListener('submit', async (e) => {

        e.preventDefault();


        // Get email and password only
        const emailInput = document.getElementById('email');

        const email = emailInput
            ? emailInput.value.trim()
            : '';

        const password = passwordInput
            ? passwordInput.value
            : '';


        // Check email and password
        if (!email || !password) {

            alert('Please enter your email and password.');

            return;
        }


        try {

            // =========================
            // Prepare Login Data
            // =========================
            const formData = new URLSearchParams();

            formData.append('username', email);
            formData.append('password', password);


            // =========================
            // Login API
            // =========================
            const response = await fetch(
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


            const data = await response.json();


            // =========================
            // Login Failed
            // =========================
            if (!response.ok) {

                alert(
                    data.detail ||
                    'Invalid email or password.'
                );

                return;
            }


            // =========================
            // Save Token
            // =========================
            localStorage.setItem(
                'access_token',
                data.access_token
            );

            localStorage.setItem(
                'token_type',
                data.token_type || 'bearer'
            );


            // =========================
            // Get Role From Backend
            // =========================
            const role = data.role;


            console.log('Login successful.');
            console.log('Role received from backend:', role);


            // If backend did not send role
            if (!role) {

                alert(
                    'Role information was not received from the server.'
                );

                return;
            }


            // Save role
            localStorage.setItem(
                'userRole',
                role
            );


            // =========================
            // Redirect Automatically
            // =========================

            if (role === 'student') {

                window.location.replace(
                    'student.html'
                );

            }

            else if (role === 'teacher') {

                window.location.replace(
                    'teacher.html'
                );

            }

            else if (role === 'admin') {

                window.location.replace(
                    'admin.html'
                );

            }

            else {

                console.error(
                    'Unknown role received:',
                    role
                );

                alert(
                    'Unknown account role: ' + role
                );
            }


        } catch (error) {

            console.error(
                'Login Error:',
                error
            );

            alert(
                'Unable to connect to the server.'
            );
        }

    });

});
