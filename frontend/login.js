document.addEventListener('DOMContentLoaded', () => {

  // ==============================
  // Password Show / Hide
  // ==============================

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


  // ==============================
  // Login Form
  // ==============================

  const loginForm =
    document.getElementById('loginForm');

  if (!loginForm) {

    console.error('Login form not found!');

    return;

  }


  loginForm.addEventListener('submit', async function (e) {

    e.preventDefault();


    const email =
      document.getElementById('email').value.trim();

    const password =
      document.getElementById('password').value;


    // ==============================
    // Validation
    // ==============================

    if (!email || !password) {

      alert('Please fill in all fields.');

      return;

    }


    try {

      // ==============================
      // LOGIN API
      // ==============================

      const formData =
        new URLSearchParams();

      formData.append('username', email);
      formData.append('password', password);


      const response = await fetch(
        'http://127.0.0.1:8000/api/v1/login',
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/x-www-form-urlencoded',

            'Accept':
              'application/json'
          },

          body: formData
        }
      );


      const data =
        await response.json();


      console.log(
        'Login API Response:',
        data
      );


      // ==============================
      // LOGIN SUCCESS
      // ==============================

      if (response.ok) {

        // ==============================
        // Check required response data
        // ==============================

        if (!data.access_token) {

          console.error(
            'Access token missing:',
            data
          );

          alert(
            'Login failed: Access token পাওয়া যায়নি।'
          );

          return;

        }


        if (!data.role) {

          console.error(
            'User role missing:',
            data
          );

          alert(
            'Login failed: User role পাওয়া যায়নি।'
          );

          return;

        }


        // ==============================
        // Save Login Information
        // ==============================

        localStorage.setItem(
          'access_token',
          data.access_token
        );

        localStorage.setItem(
          'token_type',
          data.token_type || 'bearer'
        );

        localStorage.setItem(
          'user_role',
          data.role
        );


        console.log(
          'Login Success.'
        );

        console.log(
          'User Role:',
          data.role
        );


        // ==============================
        // REDIRECT BASED ON ROLE
        // ==============================

        if (data.role === 'student') {

          alert(
            'Student Login Successful!'
          );

          window.location.href =
            'student.html';

        }

        else if (data.role === 'teacher') {

          alert(
            'Teacher Login Successful!'
          );

          window.location.href =
            'teacher.html';

        }

        else {

          console.error(
            'Unknown user role:',
            data.role
          );

          alert(
            'Unknown user role: ' +
            data.role
          );

        }

      }


      // ==============================
      // LOGIN FAILED
      // ==============================

      else {

        console.error(
          'Login Failed:',
          data
        );

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

  });

});