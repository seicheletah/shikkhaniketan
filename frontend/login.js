document.addEventListener('DOMContentLoaded', () => {

  // Password Show / Hide
  const togglePassword = document.getElementById('togglePassword');
  const passwordInput = document.getElementById('password');

  if (togglePassword && passwordInput) {
    togglePassword.addEventListener('click', function () {
      const type = passwordInput.type === 'password' ? 'text' : 'password';

      passwordInput.type = type;

      this.classList.toggle('fa-eye');
      this.classList.toggle('fa-eye-slash');
    });
  }


  // Login Form
  const loginForm = document.getElementById('loginForm');

  loginForm.addEventListener('submit', async function (e) {

    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    if (!email || !password) {
      alert('Please fill in all fields.');
      return;
    }

    try {

      const formData = new URLSearchParams();

      formData.append('username', email);
      formData.append('password', password);

      const response = await fetch(
        'http://127.0.0.1:8000/api/v1/login',
        {
          method: 'POST',

          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },

          body: formData
        }
      );

      const data = await response.json();

      if (response.ok) {

        // Login token save
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('token_type', data.token_type);

        console.log('Login Success:', data);

        alert('Login Successful!');

        // পরে dashboard তৈরি হলে এই line ব্যবহার করবে
        // window.location.href = 'student-dashboard.html';

      } else {

        alert(data.detail || 'Invalid email or password');

      }

    } catch (error) {

      console.error('Login Error:', error);

      alert('Backend server-এর সাথে connection হচ্ছে না!');

    }

  });

});