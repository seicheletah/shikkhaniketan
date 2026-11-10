document.addEventListener("DOMContentLoaded", () => {

    const API_BASE = "http://127.0.0.1:8000/api/v1";

    const loginForm = document.getElementById("loginForm");
    const passwordInput = document.getElementById("password");
    const togglePassword = document.getElementById("togglePassword");

    // Show / Hide Password
    if (togglePassword && passwordInput) {
        togglePassword.addEventListener("click", () => {
            if (passwordInput.type === "password") {
                passwordInput.type = "text";
                togglePassword.classList.replace("fa-eye", "fa-eye-slash");
            } else {
                passwordInput.type = "password";
                togglePassword.classList.replace("fa-eye-slash", "fa-eye");
            }
        });
    }

    if (!loginForm) return;

    // Send the login request to one endpoint and return { ok, data }
    async function sendLogin(url, email, password) {
        const formData = new URLSearchParams();
        formData.append("username", email);
        formData.append("password", password);

        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: formData
        });

        const data = await response.json().catch(() => ({}));
        return { ok: response.ok, data };
    }

    // Build a readable error message from the API response
    function getErrorMessage(data, fallback) {
        if (data && typeof data.detail === "string") return data.detail;
        if (data && Array.isArray(data.detail) && data.detail[0] && data.detail[0].msg) {
            return data.detail[0].msg;
        }
        return fallback;
    }

    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = document.getElementById("email").value.trim();
        const password = passwordInput.value;

        if (!email || !password) {
            alert("Please enter your email and password.");
            return;
        }

        const submitButton = loginForm.querySelector('button[type="submit"]');
        if (submitButton) submitButton.disabled = true;

        try {

            // 1) Try the normal login (student / teacher)
            let result = await sendLogin(`${API_BASE}/login`, email, password);
            const firstError = result.data;

            // 2) If it failed, try the admin login endpoint
            if (!result.ok) {
                const adminResult = await sendLogin(`${API_BASE}/login-admin`, email, password);
                if (adminResult.ok) {
                    result = adminResult;
                }
            }

            if (!result.ok) {
                alert(getErrorMessage(firstError, "Invalid email or password."));
                return;
            }

            const data = result.data;

            // SAVE TOKEN
            localStorage.setItem("access_token", data.access_token);
            localStorage.setItem("token_type", data.token_type || "bearer");
            localStorage.setItem("userRole", data.role);

            // Redirect by role
            if (data.role === "student") {
                window.location.href = "student.html";
            } else if (data.role === "teacher") {
                window.location.href = "teacher.html";
            } else if (data.role === "admin") {
                window.location.href = "admin.html";
            } else {
                alert("Unknown account role.");
            }

        } catch (error) {
            console.error("Login Error:", error);
            alert("Unable to connect to the server.");
        } finally {
            if (submitButton) submitButton.disabled = false;
        }
    });

});