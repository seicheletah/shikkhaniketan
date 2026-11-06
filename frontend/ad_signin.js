
document.addEventListener("DOMContentLoaded", () => {

    const API_BASE = "http://127.0.0.1:8000/api/v1";
    const DASHBOARD_URL = "admin.html";

    const form = document.getElementById("adminForm");

    if (!form) {
        console.error("Admin form not found!");
        return;
    }

    // COMMON API REQUEST FUNCTION
    async function apiRequest(endpoint, body = null, token = null) {

        const headers = {
            "Accept": "application/json"
        };

        if (body !== null) {
            headers["Content-Type"] = "application/json";
        }

        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_BASE}${endpoint}`, {
            method: "POST",
            headers: headers,
            ...(body !== null ? {
                body: JSON.stringify(body)
            } : {})
        });

        let data = {};

        try {
            data = await response.json();
        } catch {
            data = {};
        }

        if (!response.ok) {
            const message = Array.isArray(data.detail)
                ? data.detail.map(x => x.msg).join(", ")
                : data.detail || "API request failed";

            throw new Error(message);
        }

        return data;
    }


    // ADMIN LOGIN FUNCTION
    // Uses application/x-www-form-urlencoded

    async function adminLogin(username, password) {

        const formData = new URLSearchParams();

        formData.append("grant_type", "password");
        formData.append("username", username);
        formData.append("password", password);

        const response = await fetch(`${API_BASE}/login-admin`, {
            method: "POST",

            headers: {
                "Accept": "application/json",
                "Content-Type": "application/x-www-form-urlencoded"
            },

            body: formData
        });

        let data = {};

        try {
            data = await response.json();
        } catch {
            data = {};
        }

        if (!response.ok) {
            const message = Array.isArray(data.detail)
                ? data.detail.map(x => x.msg).join(", ")
                : data.detail || "Admin login failed";

            throw new Error(message);
        }

        return data;
    }


    // FORM SUBMIT

    form.addEventListener("submit", async (e) => {

        e.preventDefault();

        const firstName =
            document.getElementById("firstName").value.trim();

        const lastName =
            document.getElementById("lastName").value.trim();

        const email =
            document.getElementById("email").value.trim().toLowerCase();

        const password =
            document.getElementById("password").value;

        const button =
            form.querySelector('button[type="submit"]');

        if (!firstName || !lastName || !email || !password) {
            alert("Please fill all information.");
            return;
        }

        try {

            button.disabled = true;
            button.textContent = "Please wait...";


            // STEP 1: SEED ADMIN LOGIN

            const seedPassword = prompt(
                "Enter Seed Admin Password:"
            );

            if (!seedPassword) {
                throw new Error("Seed Admin login cancelled.");
            }

            const seedLogin = await adminLogin(
                "testadmin2@test.com",
                seedPassword
            );

            const seedToken = seedLogin.access_token;

            if (!seedToken) {
                throw new Error("Seed Admin access token not received.");
            }


            // STEP 2: CREATE NEW ADMIN

            const admin = await apiRequest(
                "/admin/",
                {
                    first_name: firstName,
                    last_name: lastName,
                    email_id: email,
                    role: "admin",
                    hashed_password: password
                }
            );

            if (!admin.id) {
                throw new Error("Admin ID not received.");
            }

            const userId = admin.id;

            alert("Admin created! Check your email for OTP.");


            // STEP 3: VERIFY EMAIL OTP

            const otp = prompt(
                "Enter the OTP received in your email:"
            );

            if (!otp) {
                throw new Error("OTP verification cancelled.");
            }

            await apiRequest(
                "/admin/verify-email",
                {
                    user_id: userId,
                    code: otp.trim()
                }
            );

            alert("Email verified successfully!");


            // STEP 4: GENERATE ACCESS TOKEN

            const generated = await apiRequest(
                "/admin/generate-access-token",
                null,
                seedToken
            );

            if (!generated.token) {
                throw new Error("Access token was not generated.");
            }


            // STEP 5: VERIFY GENERATED TOKEN

            await apiRequest(
                "/admin/verify-token",
                {
                    user_id: userId,
                    token: generated.token
                }
            );

            alert("Admin token verified successfully!");


            // STEP 6: LOGIN NEW ADMIN

            const newLogin = await adminLogin(
                email,
                password
            );

            if (!newLogin.access_token) {
                throw new Error("New Admin login failed.");
            }


            // STEP 7: SAVE LOGIN INFORMATION

            localStorage.setItem(
                "access_token",
                newLogin.access_token
            );

            localStorage.setItem(
                "role",
                newLogin.role || "admin"
            );


            // STEP 8: REDIRECT TO DASHBOARD

            alert("Admin account created successfully!");

            window.location.href = DASHBOARD_URL;


        } catch (error) {

            console.error("Admin Error:", error);

            alert(error.message);

        } finally {

            button.disabled = false;
            button.textContent = "OK";

        }

    });

});
