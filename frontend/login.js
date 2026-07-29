// Wait for the DOM to fully load
document.addEventListener('DOMContentLoaded', () => {

  // 1. Password Visibility Toggle (Show/Hide Password)
  const togglePassword = document.querySelector('#togglePassword');
  const passwordInput = document.querySelector('#password');

  if (togglePassword && passwordInput) {
    togglePassword.addEventListener('click', function () {
      // Toggle the type attribute
      const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
      passwordInput.setAttribute('type', type);

      // Toggle FontAwesome eye icon classes
      this.classList.toggle('fa-eye');
      this.classList.toggle('fa-eye-slash');
    });
  }

  // 2. Form Submission Handling
  const loginForm = document.getElementById('loginForm');

  if (loginForm) {
    loginForm.addEventListener('submit', function (e) {
      e.preventDefault(); // Prevent default page refresh

      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;

      // Basic Validation Check
      if (!email || !password) {
        alert('Please fill in all fields.');
        return;
      }

      // Action on Form Submit (Replace with backend API integration later)
      console.log('Login Submitted:', { email, password });
      alert(`Welcome back! Logging in with: ${email}`);
      
      // Optionally reset form
      // loginForm.reset();
    });
  }

  // 3. Google Sign-In Button Handler
  const googleBtn = document.querySelector('.btn-google');
  if (googleBtn) {
    googleBtn.addEventListener('click', () => {
      alert('Google Sign-In clicked!');
    });
  }

});