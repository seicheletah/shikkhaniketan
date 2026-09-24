document.addEventListener("DOMContentLoaded", () => {

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

    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = document.getElementById("email").value.trim();
        const password = passwordInput.value;

        if (!email || !password) {
            alert("Please enter your email and password.");
            return;
        }

        try {
            const formData = new URLSearchParams();
            formData.append("username", email);
            formData.append("password", password);

            const response = await fetch("http://127.0.0.1:8000/api/v1/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                alert(data.detail || "Invalid email or password.");
                return;
            }

            // Save Token
            localStorage.setItem("access_token", data.access_token);
            localStorage.setItem("token_type", data.token_type || "bearer");
            localStorage.setItem("userRole", data.role);

            console.log("Token Saved:", localStorage.getItem("access_token"));
            console.log("Role:", localStorage.getItem("userRole"));

            // Redirect
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
        }
    });

});