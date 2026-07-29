document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('form');
    const firstNameInput = document.getElementById('first-name');
    const lastNameInput = document.getElementById('last-name');
    const emailInput = document.getElementById('email');
    const phoneInput = document.getElementById('phone');
    const genderSelect = document.getElementById('gender');
    const dobInput = document.getElementById('dob');

    // Email validation helper
    const isValidEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    // Phone validation helper (basic 10-digit validation)
    const isValidPhone = (phone) => {
        const phoneRegex = /^[0-9]{10}$/;
        return phoneRegex.test(phone.replace(/[-()\s]/g, ''));
    };

    // Display error outline/message
    const showError = (input, message) => {
        input.style.borderColor = '#ef4444';
        
        let errorSpan = input.nextElementSibling;
        if (!errorSpan || !errorSpan.classList.contains('error-msg')) {
            errorSpan = document.createElement('span');
            errorSpan.classList.add('error-msg');
            errorSpan.style.color = '#ef4444';
            errorSpan.style.fontSize = '12px';
            errorSpan.style.display = 'block';
            errorSpan.style.marginTop = '4px';
            input.parentNode.appendChild(errorSpan);
        }
        errorSpan.textContent = message;
    };

    // Clear error outline/message
    const clearError = (input) => {
        input.style.borderColor = '#e2e8f0';
        const errorSpan = input.parentNode.querySelector('.error-msg');
        if (errorSpan) {
            errorSpan.remove();
        }
    };

    // Real-time input validation listener
    [firstNameInput, lastNameInput, emailInput, phoneInput, genderSelect, dobInput].forEach(input => {
        if (!input) return;
        
        input.addEventListener('input', () => clearError(input));
        input.addEventListener('change', () => clearError(input));
    });

    // Form submission handler
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        let isValid = true;

        // First Name check
        if (!firstNameInput.value.trim()) {
            showError(firstNameInput, 'First name is required');
            isValid = false;
        }

        // Last Name check
        if (!lastNameInput.value.trim()) {
            showError(lastNameInput, 'Last name is required');
            isValid = false;
        }

        // Email check
        if (!emailInput.value.trim()) {
            showError(emailInput, 'Email is required');
            isValid = false;
        } else if (!isValidEmail(emailInput.value.trim())) {
            showError(emailInput, 'Please enter a valid email address');
            isValid = false;
        }

        // Phone check
        if (!phoneInput.value.trim()) {
            showError(phoneInput, 'Phone number is required');
            isValid = false;
        } else if (!isValidPhone(phoneInput.value.trim())) {
            showError(phoneInput, 'Please enter a valid 10-digit phone number');
            isValid = false;
        }

        // Gender check
        if (!genderSelect.value) {
            showError(genderSelect, 'Please select your gender');
            isValid = false;
        }

        // DOB check
        if (!dobInput.value) {
            showError(dobInput, 'Date of birth is required');
            isValid = false;
        }

        // Submit form data if all inputs are valid
        if (isValid) {
            const formData = {
                firstName: firstNameInput.value.trim(),
                lastName: lastNameInput.value.trim(),
                email: emailInput.value.trim(),
                phone: phoneInput.value.trim(),
                gender: genderSelect.value,
                dob: dobInput.value
            };

            console.log('Form Submitted Successfully:', formData);

            // Optional: Visual confirmation button state
            const submitBtn = form.querySelector('button[type="submit"]');
            submitBtn.textContent = 'Account Created!';
            submitBtn.style.backgroundColor = '#16a34a';

            setTimeout(() => {
                form.reset();
                submitBtn.textContent = 'Sign In';
                submitBtn.style.backgroundColor = '#0d9488';
            }, 2500);
        }
    });
});