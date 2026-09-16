```javascript
const API_BASE_URL = "http://127.0.0.1:8000/api/v1";

const token = localStorage.getItem("access_token");
const userRole = localStorage.getItem("userRole");


// ========================================
// ROLE CONFIG
// ========================================

let profileEndpoint = "";
let uploadEndpoint = "";
let redirectPage = "";
let defaultImage = "";

if (userRole === "student") {

    profileEndpoint = `${API_BASE_URL}/students/me`;
    uploadEndpoint = `${API_BASE_URL}/students/profile-pic/upload`;
    redirectPage = "student.html";
    defaultImage = "https://i.pravatar.cc/150?img=32";

} else if (userRole === "teacher") {

    profileEndpoint = `${API_BASE_URL}/teachers/me`;
    uploadEndpoint = `${API_BASE_URL}/teachers/profile-pic/upload`;
    redirectPage = "teacher.html";
    defaultImage = "https://i.pravatar.cc/150?img=12";

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

const firstNameInput = document.getElementById("firstName");
const lastNameInput = document.getElementById("lastName");
const emailInput = document.getElementById("email");
const phoneInput = document.getElementById("phone");
const genderInput = document.getElementById("gender");
const dobInput = document.getElementById("dateOfBirth");
const addressInput = document.getElementById("address");
const aboutInput = document.getElementById("about");

const profilePhotoInput = document.getElementById("profilePhoto");
const profilePreview = document.getElementById("profilePreview");

const updateProfileForm = document.getElementById("updateProfileForm");

const saveBtn = document.getElementById("saveBtn");
const cancelBtn = document.getElementById("cancelBtn");
const backBtn = document.getElementById("backBtn");


// ========================================
// SAFE VALUE
// ========================================

function getSafeValue(value) {

    if (value === null || value === undefined) {
        return "";
    }

    if (typeof value === "string") {
        return value;
    }

    if (typeof value === "number" || typeof value === "boolean") {
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

        const response = await fetch(profileEndpoint, {

            method: "GET",

            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }

        });


        if (!response.ok) {

            if (response.status === 401) {

                alert("Session expired. Please login again.");

                localStorage.removeItem("access_token");
                localStorage.removeItem("token_type");
                localStorage.removeItem("userRole");

                window.location.href = "login.html";

                return;
            }

            throw new Error(
                `Profile load failed. Status: ${response.status}`
            );
        }


        const data = await response.json();


        console.log("PROFILE DATA:", data);


        // ========================================
        // FIRST NAME
        // ========================================

        firstNameInput.value = getSafeValue(data.first_name);


        // ========================================
        // LAST NAME
        // ========================================

        lastNameInput.value = getSafeValue(data.last_name);


        // ========================================
        // EMAIL
        // ========================================

        if (
            data.user &&
            typeof data.user === "object" &&
            typeof data.user.email_id === "string"
        ) {

            emailInput.value = data.user.email_id;

        } else if (typeof data.email === "string") {

            emailInput.value = data.email;

        } else {

            emailInput.value = "";
        }


        // ========================================
        // PHONE
        // ========================================

        phoneInput.value = getSafeValue(data.phone_no);


        // ========================================
        // GENDER
        // ========================================

        let genderValue = getSafeValue(data.gender);

        /*
         Backend jodi "male", "female", "other"
         pathay, tahole select-er value
         m / f / o te convert hobe.
        */

        const genderLower = genderValue.toLowerCase();

        if (genderLower === "male") {
            genderValue = "m";
        }
        else if (genderLower === "female") {
            genderValue = "f";
        }
        else if (genderLower === "other") {
            genderValue = "o";
        }

        genderInput.value = genderValue;


        // ========================================
        // DATE OF BIRTH
        // ========================================

        let dobValue = getSafeValue(data.date_of_birth);

        if (dobValue.includes("T")) {
            dobValue = dobValue.split("T")[0];
        }

        dobInput.value = dobValue;


        // ========================================
        // ADDRESS
        // ========================================

        addressInput.value = getSafeValue(data.address);


        // ========================================
        // ABOUT
        // ========================================

        aboutInput.value = getSafeValue(data.about);


        // ========================================
        // PROFILE PHOTO
        // ========================================

        if (
            typeof data.profile_pic === "string" &&
            data.profile_pic.trim() !== ""
        ) {

            profilePreview.src = data.profile_pic;

            profilePreview.onerror = function () {

                this.onerror = null;

                this.src = defaultImage;
            };

        } else {

            profilePreview.src = defaultImage;
        }


    } catch (error) {

        console.error("Load Profile Error:", error);

        alert("Profile load korte problem hoyeche.");

    }
}


// ========================================
// PROFILE PHOTO PREVIEW
// ========================================

if (profilePhotoInput) {

    profilePhotoInput.addEventListener("change", function () {

        const file = this.files[0];

        if (!file) {
            return;
        }


        // ========================================
        // FILE TYPE
        // ========================================

        const allowedTypes = [
            "image/jpeg",
            "image/jpg",
            "image/png"
        ];


        if (!allowedTypes.includes(file.type)) {

            alert("Only JPG, JPEG or PNG photo upload kora jabe.");

            this.value = "";

            profilePreview.src = defaultImage;

            return;
        }


        // ========================================
        // FILE SIZE
        // ========================================

        if (file.size > 5 * 1024 * 1024) {

            alert("Photo maximum 5MB hote parbe.");

            this.value = "";

            profilePreview.src = defaultImage;

            return;
        }


        // ========================================
        // SHOW PREVIEW
        // ========================================

        const reader = new FileReader();

        reader.onload = function (event) {

            profilePreview.src = event.target.result;

        };

        reader.readAsDataURL(file);

    });
}


// ========================================
// UPDATE PROFILE
// ========================================

if (updateProfileForm) {

    updateProfileForm.addEventListener("submit", async function (event) {

        event.preventDefault();


        if (!token) {

            alert("Please login first.");

            window.location.href = "login.html";

            return;
        }


        // ========================================
        // BUTTON LOADING
        // ========================================

        saveBtn.disabled = true;

        saveBtn.innerHTML =
            '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';


        try {


            // ========================================
            // PROFILE DATA
            // ========================================

            const profileData = {

                first_name: firstNameInput.value.trim(),

                last_name: lastNameInput.value.trim(),

                phone_no: phoneInput.value.trim(),

                gender: genderInput.value,

                date_of_birth: dobInput.value,

                address: addressInput.value.trim(),

                about: aboutInput.value.trim()

            };


            console.log("Sending Profile Data:", profileData);


            // ========================================
            // UPDATE PROFILE API
            // ========================================

            const response = await fetch(profileEndpoint, {

                method: "PATCH",

                headers: {

                    "Authorization": `Bearer ${token}`,

                    "Content-Type": "application/json"

                },

                body: JSON.stringify(profileData)

            });


            // ========================================
            // ERROR CHECK
            // ========================================

            if (!response.ok) {

                const errorData =
                    await response.json().catch(() => ({}));

                console.error(
                    "Profile Update Error:",
                    errorData
                );

                throw new Error(
                    errorData.detail ||
                    `Profile update failed. Status: ${response.status}`
                );
            }


            const updatedData = await response.json();

            console.log(
                "Profile Updated Successfully:",
                updatedData
            );


            // ========================================
            // PROFILE PHOTO UPLOAD
            // ========================================

            const selectedFile =
                profilePhotoInput.files[0];


            if (selectedFile) {

                console.log(
                    "Uploading profile photo..."
                );


                const formData = new FormData();

                formData.append("file", selectedFile);


                const uploadResponse = await fetch(
                    uploadEndpoint,
                    {

                        method: "POST",

                        headers: {

                            "Authorization":
                                `Bearer ${token}`

                        },

                        body: formData

                    }
                );


                if (!uploadResponse.ok) {

                    const uploadError =
                        await uploadResponse
                            .json()
                            .catch(() => ({}));


                    console.error(
                        "Photo Upload Error:",
                        uploadError
                    );


                    throw new Error(
                        uploadError.detail ||
                        "Profile photo upload failed."
                    );
                }


                const uploadData =
                    await uploadResponse.json();


                console.log(
                    "Profile Photo Uploaded:",
                    uploadData
                );
            }


            // ========================================
            // SUCCESS MESSAGE
            // ========================================

            saveBtn.innerHTML =
                '<i class="fa-solid fa-check"></i> Updated!';


            alert(
                "Profile successfully updated!"
            );


            // ========================================
            // GO BACK TO PROFILE
            // ========================================

            window.location.href = redirectPage;


        } catch (error) {

            console.error(
                "Update Profile Error:",
                error
            );


            alert(
                error.message ||
                "Profile update korte problem hoyeche."
            );


            // Restore button
            saveBtn.disabled = false;

            saveBtn.innerHTML =
                '<i class="fa-solid fa-check"></i> Save Changes';
        }

    });
}


// ========================================
// CANCEL BUTTON
// ========================================

if (cancelBtn) {

    cancelBtn.addEventListener("click", function () {

        window.location.href = redirectPage;

    });
}


// ========================================
// BACK TO PROFILE BUTTON
// ========================================

if (backBtn) {

    backBtn.addEventListener("click", function () {

        console.log("Back to Profile clicked");

        window.location.href = redirectPage;

    });
}


// ========================================
// LOAD PROFILE
// ========================================

loadProfile();
```
