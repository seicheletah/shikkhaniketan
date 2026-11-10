document.addEventListener('DOMContentLoaded', () => {

    const signupForm = document.getElementById('signupForm');

    if (!signupForm) return;

    signupForm.addEventListener('submit', (e) => {
        e.preventDefault();

        // Read the values from the sign up form
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const role = document.getElementById('role').value;

        // Check that every field is filled
        if (!email || !password || !role) {
            alert('Please fill in all fields');
            return;
        }

        // Temporarily save the data in the browser for the next step
        localStorage.setItem('signupEmail', email);
        localStorage.setItem('signupPassword', password);
        localStorage.setItem('signupRole', role);

        // Go to the Create Account page (works for student, teacher and admin)
        window.location.href = 'create_account.html';
    });

});