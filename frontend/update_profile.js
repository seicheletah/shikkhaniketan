
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

        return "";
    }

    return "";
}


// ========================================
// LOAD PROFILE
// ========================================

async function loadProfile() {

    try {

        console.log("Loading profile...");

        const response = await fetch(
            profileEndpoint,
            {
                method: "GET",

                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Accept": "application/json"
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

            if (
                data.user &&
                typeof data.user === "object" &&
                typeof data.user.email_id === "string"
            ) {

                emailInput.value =
                    data.user.email_id;

            } else if (
                typeof data.email_id === "string"
            ) {

                emailInput.value =
                    data.email_id;

            } else if (
                typeof data.email === "string"
            ) {

                emailInput.value =
                    data.email;

            } else {

                emailInput.value = "";
            }
        }


        // ========================================
        // PHONE
        // ========================================

        if (phoneInput) {

            phoneInput.value =
                getSafeValue(
                    data.phone_no
                );
        }


        // ========================================
        // GENDER
        // ========================================

        if (genderInput) {

            let genderValue =
                getSafeValue(
                    data.gender
                );

            const genderLower =
                genderValue.toLowerCase();


            if (genderLower === "male") {

                genderValue = "m";

            } else if (
                genderLower === "female"
            ) {

                genderValue = "f";

            } else if (
                genderLower === "other"
            ) {

                genderValue = "o";
            }


            genderInput.value =
                genderValue;
        }


        // ========================================
        // DATE OF BIRTH
        // ========================================

        if (dobInput) {

            let dobValue =
                getSafeValue(
                    data.date_of_birth
                );


            if (dobValue.includes("T")) {

                dobValue =
                    dobValue.split("T")[0];
            }


            dobInput.value =
                dobValue;
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
            "Profile loaded successfully."
        );


    } catch (error) {

        console.error(
            "Load Profile Error:",
            error
        );

        alert(
            "Profile load korte problem hoyeche."
        );
    }
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
            // CHECK TOKEN
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

                    phone_no:
                        phoneInput
                            ? phoneInput.value.trim()
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
                // ERROR CHECK
                // ========================================

                if (!response.ok) {

                    const errorData =
                        await response
                            .json()
                            .catch(
                                () => ({})
                            );


                    console.error(
                        "Profile Update Error:",
                        errorData
                    );


                    throw new Error(
                        errorData.detail ||
                        `Profile update failed. Status: ${response.status}`
                    );
                }


                // ========================================
                // UPDATED DATA
                // ========================================

                const updatedData =
                    await response.json();


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

