document.addEventListener('DOMContentLoaded', () => {

    const signupForm = document.getElementById('signupForm');

    signupForm.addEventListener('submit', (e) => {
        e.preventDefault();

        // Signup page থেকে data নেওয়া
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const role = document.getElementById('role').value;

        // সব field check করা
        if (!email || !password || !role) {
            alert('Please fill in all fields');
            return;
        }

        // Data temporary ভাবে browser-এ save করা
        localStorage.setItem('signupEmail', email);
        localStorage.setItem('signupPassword', password);
        localStorage.setItem('signupRole', role);

        console.log('Signup Step 1 Data:', {
            email,
            password,
            role
        });

        // এরপর Account Creation page-এ যাওয়া
        window.location.href = 'create_account.html';
    });

});