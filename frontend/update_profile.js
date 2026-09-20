const API_BASE_URL = "http://127.0.0.1:8000/api/v1";

const token = localStorage.getItem("access_token");
const userRole = localStorage.getItem("userRole");


// ========================================
// ROLE CONFIG
// ========================================

let profileEndpoint = "";
let redirectPage = "";

if (userRole === "student") {

    profileEndpoint = `${API_BASE_URL}/students/me`;
    redirectPage = "student.html";

} else if (userRole === "teacher") {

    profileEndpoint = `${API_BASE_URL}/teachers/me`;
    redirectPage = "teacher.html";

} else {

    alert("User role not found. Please login again.");

    window.location.href = "login.html";
}


// ========================================
// CHECK LOGIN
// ========================================

if (!token) {

    alert("Please login first.");

    window.location.href = "login.html";
}


// ========================================
// GET HTML ELEMENTS
// ========================================

const firstNameInput =
    document.getElementById("firstName");

const lastNameInput =
    document.getElementById("lastName");

const emailInput =
    document.getElementById("email");

const phoneInput =
    document.getElementById("phone");

const genderInput =
    document.getElementById("gender");

const dobInput =
    document.getElementById("dateOfBirth");

const addressInput =
    document.getElementById("address");

const aboutInput =
    document.getElementById("about");

const updateProfileForm =
    document.getElementById("updateProfileForm");

const saveBtn =
    document.getElementById("saveBtn");

const cancelBtn =
    document.getElementById("cancelBtn");


// ========================================
// STORE ORIGINAL VALUES
// ========================================

let originalPhoneNumber = "";
let originalEmail = "";


// ========================================
// SAFE VALUE
// ========================================

function getSafeValue(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    if (typeof value === "string") {
        return value;
    }

    if (
        typeof value === "number" ||
        typeof value === "boolean"
    ) {
        return String(value);
    }

    if (typeof value === "object") {

        if (typeof value.value === "string") {
            return value.value;
        }

        if (typeof value.name === "string") {
            return value.name;
        }

        if (typeof value.text === "string") {
            return value.text;
        }

        if (typeof value.email_id === "string") {
            return value.email_id;
        }

        if (typeof value.email === "string") {
            return value.email;
        }

        return "";
    }

    return "";
}


// ========================================
// NORMALIZE PHONE
// ========================================

function normalizePhone(value) {

    return getSafeValue(value)
        .replace(/\s+/g, "")
        .trim();
}


// ========================================
// NORMALIZE EMAIL
// ========================================

function normalizeEmail(value) {

    return getSafeValue(value)
        .trim()
        .toLowerCase();
}


// ========================================
// NORMALIZE GENDER
// ========================================

function normalizeGender(value) {

    const gender = getSafeValue(value)
        .toLowerCase()
        .trim();

    if (
        gender === "male" ||
        gender === "m"
    ) {
        return "m";
    }

    if (
        gender === "female" ||
        gender === "f"
    ) {
        return "f";
    }

    if (
        gender === "other" ||
        gender === "o"
    ) {
        return "o";
    }

    return gender;
}


// ========================================
// NORMALIZE DATE
// ========================================

function normalizeDate(value) {

    let dateValue = getSafeValue(value);

    if (dateValue.includes("T")) {

        dateValue =
            dateValue.split("T")[0];
    }

    return dateValue;
}


// ========================================
// LOAD PROFILE
// ========================================

async function loadProfile() {

    if (!token) {
        return;
    }

    try {

        console.log("Loading profile...");

        const response = await fetch(
            profileEndpoint,
            {
                method: "GET",

                headers: {
                    "Authorization":
                        `Bearer ${token}`,

                    "Accept":
                        "application/json"
                }
            }
        );


        // ========================================
        // SESSION EXPIRED
        // ========================================

        if (response.status === 401) {

            alert(
                "Session expired. Please login again."
            );

            localStorage.removeItem(
                "access_token"
            );

            localStorage.removeItem(
                "token_type"
            );

            localStorage.removeItem(
                "userRole"
            );

            window.location.href =
                "login.html";

            return;
        }


        // ========================================
        // OTHER ERROR
        // ========================================

        if (!response.ok) {

            throw new Error(
                `Profile load failed. Status: ${response.status}`
            );
        }


        // ========================================
        // GET PROFILE DATA
        // ========================================

        const data =
            await response.json();

        console.log(
            "PROFILE DATA:",
            data
        );


        // ========================================
        // FIRST NAME
        // ========================================

        if (firstNameInput) {

            firstNameInput.value =
                getSafeValue(
                    data.first_name
                );
        }


        // ========================================
        // LAST NAME
        // ========================================

        if (lastNameInput) {

            lastNameInput.value =
                getSafeValue(
                    data.last_name
                );
        }


        // ========================================
        // EMAIL
        // ========================================

        if (emailInput) {

            let emailValue = "";


            if (
                data.user &&
                typeof data.user === "object"
            ) {

                emailValue =
                    getSafeValue(
                        data.user.email_id
                    );
            }


            if (!emailValue) {

                emailValue =
                    getSafeValue(
                        data.email_id
                    );
            }


            if (!emailValue) {

                emailValue =
                    getSafeValue(
                        data.email
                    );
            }


            emailInput.value =
                emailValue;


            originalEmail =
                normalizeEmail(
                    emailValue
                );
        }


        // ========================================
        // PHONE
        // ========================================

        if (phoneInput) {

            const phoneValue =
                getSafeValue(
                    data.phone_no
                );

            phoneInput.value =
                phoneValue;


            // SAVE ORIGINAL PHONE
            originalPhoneNumber =
                normalizePhone(
                    phoneValue
                );
        }


        // ========================================
        // GENDER
        // ========================================

        if (genderInput) {

            genderInput.value =
                normalizeGender(
                    data.gender
                );
        }


        // ========================================
        // DATE OF BIRTH
        // ========================================

        if (dobInput) {

            dobInput.value =
                normalizeDate(
                    data.date_of_birth
                );
        }


        // ========================================
        // ADDRESS
        // ========================================

        if (addressInput) {

            addressInput.value =
                getSafeValue(
                    data.address
                );
        }


        // ========================================
        // ABOUT
        // ========================================

        if (aboutInput) {

            aboutInput.value =
                getSafeValue(
                    data.about
                );
        }


        console.log(
            "Original Phone:",
            originalPhoneNumber
        );

        console.log(
            "Original Email:",
            originalEmail
        );

        console.log(
            "Profile loaded successfully."
        );

    } catch (error) {

        console.error(
            "Load Profile Error:",
            error
        );

        alert(
            error.message ||
            "Profile load korte problem hoyeche."
        );
    }
}


// ========================================
// GET ERROR MESSAGE
// ========================================

async function getErrorMessage(response) {

    try {

        const errorData =
            await response.json();


        if (
            typeof errorData.detail ===
            "string"
        ) {

            return errorData.detail;
        }


        if (
            Array.isArray(
                errorData.detail
            )
        ) {

            return errorData.detail
                .map(error => {

                    if (
                        typeof error ===
                        "string"
                    ) {

                        return error;
                    }

                    return (
                        error.msg ||
                        "Invalid data"
                    );

                })
                .join(", ");
        }


        if (errorData.message) {

            return errorData.message;
        }

    } catch (error) {

        console.error(
            "Error reading API error:",
            error
        );
    }


    return `Profile update failed. Status: ${response.status}`;
}


// ========================================
// UPDATE PROFILE
// ========================================

if (updateProfileForm) {

    updateProfileForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            // ========================================
            // TOKEN CHECK
            // ========================================

            if (!token) {

                alert(
                    "Please login first."
                );

                window.location.href =
                    "login.html";

                return;
            }


            // ========================================
            // CURRENT VALUES
            // ========================================

            const newPhoneNumber =
                phoneInput
                    ? normalizePhone(
                        phoneInput.value
                    )
                    : "";


            const newEmail =
                emailInput
                    ? normalizeEmail(
                        emailInput.value
                    )
                    : "";


            // ========================================
            // BUTTON LOADING
            // ========================================

            if (saveBtn) {

                saveBtn.disabled = true;

                saveBtn.innerHTML =
                    '<i class="fa-solid fa-spinner fa-spin"></i> Updating...';
            }


            try {

                // ========================================
                // PROFILE DATA
                // ========================================

                const profileData = {

                    first_name:
                        firstNameInput
                            ? firstNameInput.value.trim()
                            : "",

                    last_name:
                        lastNameInput
                            ? lastNameInput.value.trim()
                            : "",

                    email:
                        emailInput
                            ? emailInput.value.trim()
                            : "",

                    gender:
                        genderInput
                            ? genderInput.value
                            : "",

                    date_of_birth:
                        dobInput
                            ? dobInput.value
                            : "",

                    address:
                        addressInput
                            ? addressInput.value.trim()
                            : "",

                    about:
                        aboutInput
                            ? aboutInput.value.trim()
                            : ""
                };


                // ========================================
                // IMPORTANT PHONE LOGIC
                // ========================================

                /*
                 * Phone number change না করলে
                 * phone_no PATCH request-এ পাঠানো হবে না।
                 *
                 * তাই:
                 *
                 * Old: 9876543210
                 * New: 9876543210
                 *
                 * → phone_no যাবে না
                 *
                 * কিন্তু:
                 *
                 * Old: 9876543210
                 * New: 9123456789
                 *
                 * → phone_no যাবে
                 */

                if (
                    newPhoneNumber &&
                    newPhoneNumber !==
                    originalPhoneNumber
                ) {

                    profileData.phone_no =
                        newPhoneNumber;

                    console.log(
                        "Phone number changed. Sending new phone."
                    );

                } else {

                    console.log(
                        "Phone number unchanged. Phone field skipped."
                    );
                }


                // ========================================
                // LOG DATA
                // ========================================

                console.log(
                    "Original Phone:",
                    originalPhoneNumber
                );

                console.log(
                    "New Phone:",
                    newPhoneNumber
                );

                console.log(
                    "Sending Profile Data:",
                    profileData
                );


                // ========================================
                // UPDATE PROFILE API
                // ========================================

                const response =
                    await fetch(
                        profileEndpoint,
                        {
                            method: "PATCH",

                            headers: {

                                "Authorization":
                                    `Bearer ${token}`,

                                "Content-Type":
                                    "application/json",

                                "Accept":
                                    "application/json"
                            },

                            body:
                                JSON.stringify(
                                    profileData
                                )
                        }
                    );


                // ========================================
                // SESSION EXPIRED
                // ========================================

                if (
                    response.status === 401
                ) {

                    alert(
                        "Session expired. Please login again."
                    );

                    localStorage.removeItem(
                        "access_token"
                    );

                    localStorage.removeItem(
                        "token_type"
                    );

                    localStorage.removeItem(
                        "userRole"
                    );

                    window.location.href =
                        "login.html";

                    return;
                }


                // ========================================
                // UPDATE ERROR
                // ========================================

                if (!response.ok) {

                    const message =
                        await getErrorMessage(
                            response
                        );

                    console.error(
                        "Profile Update Error:",
                        message
                    );


                    // ========================================
                    // PHONE DUPLICATE
                    // ========================================

                    if (
                        message
                            .toLowerCase()
                            .includes("phone") &&
                        (
                            message
                                .toLowerCase()
                                .includes("exist") ||
                            message
                                .toLowerCase()
                                .includes("already")
                        )
                    ) {

                        throw new Error(
                            "Phone number already exists."
                        );
                    }


                    // ========================================
                    // EMAIL DUPLICATE
                    // ========================================

                    if (
                        message
                            .toLowerCase()
                            .includes("email") &&
                        (
                            message
                                .toLowerCase()
                                .includes("exist") ||
                            message
                                .toLowerCase()
                                .includes("already")
                        )
                    ) {

                        throw new Error(
                            "Email already exists."
                        );
                    }


                    throw new Error(
                        message
                    );
                }


                // ========================================
                // UPDATED DATA
                // ========================================

                let updatedData = null;

                try {

                    updatedData =
                        await response.json();

                } catch (error) {

                    console.log(
                        "No JSON response body."
                    );
                }


                console.log(
                    "Profile Updated Successfully:",
                    updatedData
                );


                // ========================================
                // SUCCESS BUTTON
                // ========================================

                if (saveBtn) {

                    saveBtn.innerHTML =
                        '<i class="fa-solid fa-check"></i> Updated!';
                }


                // ========================================
                // SUCCESS MESSAGE
                // ========================================

                alert(
                    "Profile successfully updated!"
                );


                // ========================================
                // GO BACK TO DASHBOARD
                // ========================================

                window.location.href =
                    redirectPage;

            } catch (error) {

                console.error(
                    "Update Profile Error:",
                    error
                );


                alert(
                    error.message ||
                    "Profile update korte problem hoyeche."
                );


                // ========================================
                // RESTORE BUTTON
                // ========================================

                if (saveBtn) {

                    saveBtn.disabled = false;

                    saveBtn.innerHTML =
                        '<i class="fa-solid fa-check"></i> Update Profile';
                }
            }

        }
    );
}


// ========================================
// CANCEL BUTTON
// ========================================

if (cancelBtn) {

    cancelBtn.addEventListener(
        "click",
        function () {

            window.location.href =
                redirectPage;
        }
    );
}


// ========================================
// LOAD PROFILE
// ========================================

loadProfile();