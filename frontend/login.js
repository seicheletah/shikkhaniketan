/* ==========================================================
   login.js  -  Login page for STUDENTS and TEACHERS only

   WHAT CHANGED
   - Before: if the normal login failed, this file silently tried the
     admin login too. That meant TWO requests (slow).
   - Now: only ONE request goes to /login.
   - Admins have their own login page (admin_signup.html). If an
     admin account ever comes back from this page, it is refused.
   ========================================================== */
document.addEventListener("DOMContentLoaded", () => {
  // ------------------------------------------------------
  // CONFIG
  // ------------------------------------------------------
  const API_BASE = "api/v1";
  const LOGIN_URL = `${API_BASE}/login`; // the ONLY endpoint used here

  // ------------------------------------------------------
  // ELEMENTS
  // ------------------------------------------------------
  const loginForm = document.getElementById("loginForm");
  const passwordInput = document.getElementById("password");
  const togglePassword = document.getElementById("togglePassword");

  // ------------------------------------------------------
  // SHOW / HIDE PASSWORD (the little eye icon)
  // ------------------------------------------------------
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

  // ------------------------------------------------------
  // HELPER: build a readable error message from the API answer
  // FastAPI sends { detail: "text" } or { detail: [ { msg: "text" } ] }
  // ------------------------------------------------------
  function getErrorMessage(data, fallback) {
    if (data && typeof data.detail === "string") return data.detail;
    if (data && Array.isArray(data.detail) && data.detail[0] && data.detail[0].msg) {
      return data.detail[0].msg;
    }
    return fallback;
  }

  // ------------------------------------------------------
  // SUBMIT: send the login request
  // ------------------------------------------------------
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault(); // stop the browser from reloading the page

    const email = document.getElementById("email").value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      alert("Please enter your email and password.");
      return;
    }

    // Disable the button so the user cannot click twice
    const submitButton = loginForm.querySelector('button[type="submit"]');
    if (submitButton) submitButton.disabled = true;

    try {
      // The login endpoint expects form data (not JSON):
      // the email goes into the field called "username"
      const formData = new URLSearchParams();
      formData.append("username", email);
      formData.append("password", password);

      const response = await fetch(LOGIN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData,
      });

      const data = await response.json().catch(() => ({}));

      // Wrong email / password (or any other server error)
      if (!response.ok) {
        alert(getErrorMessage(data, "Invalid email or password."));
        return;
      }

      // This page is not for admins: do NOT save the session for them
      if (data.role === "admin") {
        alert(
          "This is the student / teacher login. Please use the Admin button on the home page to log in as an admin.",
        );
        return;
      }

      // SAVE THE SESSION (the token proves the user is logged in)
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("token_type", data.token_type || "bearer");
      localStorage.setItem("userRole", data.role);

      // Open the right dashboard for the role
      if (data.role === "student") {
        window.location.href = "student.html";
      } else if (data.role === "teacher") {
        window.location.href = "teacher.html";
      } else {
        // Unknown role: remove what we just saved
        localStorage.removeItem("access_token");
        localStorage.removeItem("token_type");
        localStorage.removeItem("userRole");
        alert("Unknown account role.");
      }
    } catch (error) {
      console.error("Login Error:", error);
      alert("Unable to connect to the server.");
    } finally {
      // Always enable the button again
      if (submitButton) submitButton.disabled = false;
    }
  });
});
