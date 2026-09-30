document.addEventListener("DOMContentLoaded", () => {

    const API_BASE = "http://127.0.0.1:8000/api/v1";

    const token = localStorage.getItem("access_token");

    if (!token) {
        window.location.href = "login.html";
        return;
    }

    // =====================================================
    // HEADERS
    // =====================================================

    const jsonHeaders = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json"
    };

    // =====================================================
    // TOP BAR
    // =====================================================

    const topBar = document.querySelector(".top-bar");

    const teacherProfileImg =
        document.getElementById("teacherProfileImg");

    const teacherUserName =
        document.getElementById("teacherUserName");

    // =====================================================
    // NAV
    // =====================================================

    const coursesLink =
        document.querySelector('[data-page="courses"]');

    const settingsLink =
        document.querySelector('[data-page="settings"]');

    const logoutLink =
        document.querySelector('[data-page="logout"]');

    const coursesSection =
        document.getElementById("courses");

    const settingsSection =
        document.getElementById("settings");

    // =====================================================
    // SETTINGS
    // =====================================================

    const teacherFirstName =
        document.getElementById("teacherFirstName");

    const teacherLastName =
        document.getElementById("teacherLastName");

    const teacherEmail =
        document.getElementById("teacherEmail");

    const teacherPhone =
        document.getElementById("teacherPhone");

    const teacherGender =
        document.getElementById("teacherGender");

    const teacherDob =
        document.getElementById("teacherDob");

    const teacherAddress =
        document.getElementById("teacherAddress");

    const teacherAbout =
        document.getElementById("teacherAbout");

    // =====================================================
    // FORM
    // =====================================================

    const addCourseForm =
        document.getElementById("addCourseForm");

    const courseNameInput =
        document.getElementById("courseName");

    const courseDetailsInput =
        document.getElementById("courseDetails");

    const languageInput =
        document.getElementById("language");

    const courseTypeInput =
        document.getElementById("courseType");

    const priceInput =
        document.getElementById("price");

    const resourceTypeInput =
        document.getElementById("resourceType");

    const thumbnailInput =
        document.getElementById("thumbnailInput");

    const fileInput =
        document.getElementById("fileInput");

    const thumbnailText =
        document.getElementById("thumbnailText");

    const fileText =
        document.getElementById("fileText");

    // =====================================================
    // SHOW SECTION
    // =====================================================

    function showSection(section) {

        if (coursesSection) {
            coursesSection.style.display =
                section === "courses" ? "block" : "none";
        }

        if (settingsSection) {
            settingsSection.style.display =
                section === "settings" ? "block" : "none";
        }

        if (section === "settings") {

            topBar?.classList.add("hide-search");

            loadTeacherProfile();

        } else {

            topBar?.classList.remove("hide-search");
        }
    }

    // =====================================================
    // NAVIGATION
    // =====================================================

    coursesLink?.addEventListener("click", e => {

        e.preventDefault();

        showSection("courses");
    });

    settingsLink?.addEventListener("click", e => {

        e.preventDefault();

        showSection("settings");
    });

    // =====================================================
    // PROFILE
    // =====================================================

    async function loadTeacherProfile() {

        try {

            const response = await fetch(
                `${API_BASE}/teachers/me`,
                {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: "application/json"
                    }
                }
            );

            if (response.status === 401) {

                localStorage.clear();

                window.location.href = "login.html";

                return;
            }

            if (!response.ok) {

                console.error(
                    "Teacher profile loading failed"
                );

                return;
            }

            const data = await response.json();

            const fullName =
                `${data.first_name || ""} ${data.last_name || ""}`
                    .trim();

            if (teacherUserName) {

                teacherUserName.textContent =
                    fullName || "Teacher";
            }

            if (teacherProfileImg) {

                teacherProfileImg.src =
                    data.profile_pic ||
                    "https://i.pravatar.cc/150?img=47";
            }

            if (teacherFirstName) {
                teacherFirstName.textContent =
                    data.first_name || "-";
            }

            if (teacherLastName) {
                teacherLastName.textContent =
                    data.last_name || "-";
            }

            if (teacherEmail) {
                teacherEmail.textContent =
                    data.user?.email_id || "-";
            }

            if (teacherPhone) {
                teacherPhone.textContent =
                    data.phone_no || "-";
            }

            if (teacherGender) {
                teacherGender.textContent =
                    data.gender || "-";
            }

            if (teacherDob) {
                teacherDob.textContent =
                    data.date_of_birth || "-";
            }

            if (teacherAddress) {
                teacherAddress.textContent =
                    data.address || "-";
            }

            if (teacherAbout) {
                teacherAbout.textContent =
                    data.about || "-";
            }

        } catch (err) {

            console.error(
                "Teacher Profile Error:",
                err
            );
        }
    }

    // =====================================================
    // LOGOUT
    // =====================================================

    logoutLink?.addEventListener("click", e => {

        e.preventDefault();

        localStorage.clear();

        window.location.href = "login.html";
    });

    // =====================================================
    // PRICE
    // =====================================================

    window.togglePriceField = value => {

        if (!priceInput) return;

        if (value === "paid") {

            priceInput.disabled = false;
            priceInput.required = true;

        } else {

            priceInput.disabled = true;
            priceInput.required = false;
            priceInput.value = "";
        }
    };

    // =====================================================
    // FILE NAME
    // =====================================================

    window.updateFileName = input => {

        if (!input || !input.files.length) {
            return;
        }

        const fileName = input.files[0].name;

        if (
            input.id === "thumbnailInput" &&
            thumbnailText
        ) {

            thumbnailText.textContent = fileName;
        }

        if (
            input.id === "fileInput" &&
            fileText
        ) {

            fileText.textContent = fileName;
        }
    };

    // =====================================================
    // THUMBNAIL FILE CHANGE
    // =====================================================

    thumbnailInput?.addEventListener("change", () => {

        if (!thumbnailInput.files.length) {

            if (thumbnailText) {

                thumbnailText.textContent =
                    "Click to Upload Thumbnail";
            }

            return;
        }

        const file =
            thumbnailInput.files[0];

        if (thumbnailText) {

            thumbnailText.textContent =
                file.name;
        }
    });

    // =====================================================
    // RESOURCE FILE CHANGE
    // =====================================================

    fileInput?.addEventListener("change", () => {

        if (!fileInput.files.length) {

            if (fileText) {

                fileText.textContent =
                    "Click to Upload Video / PDF";
            }

            return;
        }

        const file =
            fileInput.files[0];

        if (fileText) {

            fileText.textContent =
                file.name;
        }
    });

    // =====================================================
    // FILE HELPERS
    // =====================================================

    const ext = file => {

        return file.name
            .split(".")
            .pop()
            .toLowerCase();
    };

    const nameOnly = file => {

        return file.name.replace(
            /\.[^/.]+$/,
            ""
        );
    };

    // =====================================================
    // S3 UPLOAD
    // =====================================================

    async function uploadToS3(url, file) {

        if (!url) {
            throw new Error(
                `Upload URL was not returned for ${file.name}`
            );
        }

        const response = await fetch(
            url,
            {
                method: "PUT",

                headers: {
                    "Content-Type":
                        file.type ||
                        "application/octet-stream"
                },

                body: file
            }
        );

        if (!response.ok) {

            throw new Error(
                `Failed to upload ${file.name}`
            );
        }
    }

    // =====================================================
    // MARK MEDIA READY
    // =====================================================

    async function markReady(courseId, mediaId) {

        if (!mediaId) {
            throw new Error(
                "Media ID was not returned by server."
            );
        }

        const response = await fetch(
            `${API_BASE}/courses/${courseId}/media/${mediaId}/status`,
            {
                method: "POST",

                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json"
                }
            }
        );

        if (!response.ok) {

            let data = {};

            try {
                data = await response.json();
            } catch {
                data = {};
            }

            console.error(
                "Media Status Error:",
                data
            );

            throw new Error(
                getApiErrorMessage(
                    data,
                    "Media status update failed."
                )
            );
        }
    }

    // =====================================================
    // API ERROR MESSAGE
    // =====================================================

    function getApiErrorMessage(
        data,
        defaultMessage
    ) {

        if (!data) {
            return defaultMessage;
        }

        if (typeof data.detail === "string") {
            return data.detail;
        }

        if (Array.isArray(data.detail)) {

            return data.detail
                .map(item => {

                    if (typeof item === "string") {
                        return item;
                    }

                    return (
                        item.msg ||
                        item.message ||
                        JSON.stringify(item)
                    );
                })
                .join(", ");
        }

        if (
            data.detail &&
            typeof data.detail === "object"
        ) {

            return JSON.stringify(
                data.detail
            );
        }

        if (typeof data.message === "string") {
            return data.message;
        }

        return defaultMessage;
    }

    // =====================================================
    // CREATE COURSE
    // =====================================================

    async function createCourse() {

        const selectedResourceType =
            resourceTypeInput?.value;

        if (!selectedResourceType) {

            throw new Error(
                "Please select a Resource Type."
            );
        }

        const courseData = {

            course_name:
                courseNameInput.value.trim(),

            course_details:
                courseDetailsInput.value.trim(),

            course_language:
                languageInput.value,

            course_paid:
                courseTypeInput.value === "paid",

            course_price:
                courseTypeInput.value === "paid"
                    ? Number(priceInput.value)
                    : 0,

            course_price_currency:
                "INR",

            course_resource_type:
                selectedResourceType
        };

        console.log(
            "Creating Course:",
            courseData
        );

        const response = await fetch(
            `${API_BASE}/courses/`,
            {
                method: "POST",

                headers: jsonHeaders,

                body: JSON.stringify(courseData)
            }
        );

        let data = {};

        try {

            data = await response.json();

        } catch {

            data = {};
        }

        if (!response.ok) {

            console.error(
                "Course Create Error:",
                data
            );

            throw new Error(
                getApiErrorMessage(
                    data,
                    "Course creation failed."
                )
            );
        }

        return data;
    }

    // =====================================================
    // UPLOAD THUMBNAIL
    // =====================================================

    async function uploadThumbnail(
        courseId,
        file
    ) {

        if (!courseId || !file) {

            throw new Error(
                "Thumbnail file is missing."
            );
        }

        // Only JPG / JPEG / PNG
        const allowedThumbnailTypes = [
            "image/jpeg",
            "image/png"
        ];

        if (
            !allowedThumbnailTypes.includes(
                file.type
            )
        ) {

            throw new Error(
                "Thumbnail must be JPG, JPEG or PNG."
            );
        }

        /*
         IMPORTANT:
         Backend expects MIME type:
         image/jpeg
         image/png

         NOT:
         image
        */

        const requestBody = {

            category: "thumbnail",

            media_type: file.type,

            file_name: nameOnly(file),

            file_extension: ext(file)
        };

        console.log(
            "Thumbnail Upload Request:",
            requestBody
        );

        const response = await fetch(
            `${API_BASE}/courses/${courseId}/media/thumbnail/upload`,
            {
                method: "POST",

                headers: jsonHeaders,

                body: JSON.stringify(
                    requestBody
                )
            }
        );

        let data = {};

        try {

            data = await response.json();

        } catch {

            data = {};
        }

        if (!response.ok) {

            console.error(
                "Thumbnail Upload Error:",
                data
            );

            throw new Error(
                getApiErrorMessage(
                    data,
                    "Thumbnail upload failed."
                )
            );
        }

        if (!data.upload_url) {

            throw new Error(
                "Thumbnail upload URL was not returned by server."
            );
        }

        // Upload actual file
        await uploadToS3(
            data.upload_url,
            file
        );

        // Mark media ready
        await markReady(
            courseId,
            data.media_id
        );

        return data;
    }

    // =====================================================
    // UPLOAD RESOURCE
    // =====================================================

    async function uploadResource(
        courseId,
        file
    ) {

        if (!courseId || !file) {

            throw new Error(
                "Resource file is missing."
            );
        }

        const selectedType =
            resourceTypeInput?.value;

        if (!selectedType) {

            throw new Error(
                "Please select Resource Type."
            );
        }

        let mediaType = "";

        // -------------------------------------------------
        // VIDEO
        // -------------------------------------------------

        if (selectedType === "video") {

            if (file.type !== "video/mp4") {

                throw new Error(
                    "Please upload an MP4 video for Video resource type."
                );
            }

            mediaType = "video/mp4";
        }

        // -------------------------------------------------
        // DOCUMENT
        // -------------------------------------------------

        else if (
            selectedType === "document"
        ) {

            if (
                file.type !==
                "application/pdf"
            ) {

                throw new Error(
                    "Please upload a PDF file for Document resource type."
                );
            }

            mediaType =
                "application/pdf";
        }

        else {

            throw new Error(
                "Invalid Resource Type."
            );
        }

        const requestBody = {

            category: "resource",

            media_type: mediaType,

            file_name: nameOnly(file),

            file_extension: ext(file)
        };

        console.log(
            "Resource Upload Request:",
            requestBody
        );

        const response = await fetch(
            `${API_BASE}/courses/${courseId}/media/resource/upload`,
            {
                method: "POST",

                headers: jsonHeaders,

                body: JSON.stringify(
                    requestBody
                )
            }
        );

        let data = {};

        try {

            data = await response.json();

        } catch {

            data = {};
        }

        if (!response.ok) {

            console.error(
                "Resource Upload Error:",
                data
            );

            throw new Error(
                getApiErrorMessage(
                    data,
                    "Resource upload failed."
                )
            );
        }

        if (!data.upload_url) {

            throw new Error(
                "Resource upload URL was not returned by server."
            );
        }

        // Upload actual video/PDF
        await uploadToS3(
            data.upload_url,
            file
        );

        // Mark media ready
        await markReady(
            courseId,
            data.media_id
        );

        return data;
    }

    // =====================================================
    // SUBMIT COURSE
    // =====================================================

    addCourseForm?.addEventListener(
        "submit",
        async e => {

            e.preventDefault();

            const submitButton =
                addCourseForm.querySelector(
                    'button[type="submit"]'
                );

            // Prevent double submit
            if (submitButton) {

                submitButton.disabled =
                    true;

                submitButton.textContent =
                    "Creating Course...";
            }

            try {

                // =========================================
                // BASIC VALIDATION
                // =========================================

                if (
                    !courseNameInput.value.trim()
                ) {

                    throw new Error(
                        "Please enter Course Name."
                    );
                }

                if (
                    !courseDetailsInput.value.trim()
                ) {

                    throw new Error(
                        "Please enter Course Details."
                    );
                }

                if (!languageInput.value) {

                    throw new Error(
                        "Please select Language."
                    );
                }

                if (!courseTypeInput.value) {

                    throw new Error(
                        "Please select Course Type."
                    );
                }

                // =========================================
                // PRICE
                // =========================================

                if (
                    courseTypeInput.value ===
                        "paid" &&
                    (
                        !priceInput.value ||
                        Number(priceInput.value) <= 0
                    )
                ) {

                    throw new Error(
                        "Please enter a valid course price."
                    );
                }

                // =========================================
                // RESOURCE TYPE
                // =========================================

                if (
                    !resourceTypeInput ||
                    !resourceTypeInput.value
                ) {

                    throw new Error(
                        "Please select Resource Type."
                    );
                }

                // =========================================
                // THUMBNAIL
                // =========================================

                if (
                    !thumbnailInput ||
                    !thumbnailInput.files.length
                ) {

                    throw new Error(
                        "Please upload a course thumbnail."
                    );
                }

                const thumbnailFile =
                    thumbnailInput.files[0];

                // Thumbnail must be JPG/PNG
                if (
                    thumbnailFile.type !==
                        "image/jpeg" &&
                    thumbnailFile.type !==
                        "image/png"
                ) {

                    throw new Error(
                        "Thumbnail must be JPG, JPEG or PNG."
                    );
                }

                // =========================================
                // RESOURCE
                // =========================================

                if (
                    !fileInput ||
                    !fileInput.files.length
                ) {

                    throw new Error(
                        "Please upload a course video or PDF."
                    );
                }

                const resourceFile =
                    fileInput.files[0];

                const selectedType =
                    resourceTypeInput.value;

                // =========================================
                // RESOURCE VALIDATION
                // =========================================

                if (
                    selectedType === "video" &&
                    resourceFile.type !==
                        "video/mp4"
                ) {

                    throw new Error(
                        "Resource Type is Video, so please upload an MP4 video."
                    );
                }

                if (
                    selectedType === "document" &&
                    resourceFile.type !==
                        "application/pdf"
                ) {

                    throw new Error(
                        "Resource Type is Document, so please upload a PDF file."
                    );
                }

                // =========================================
                // 1. CREATE COURSE
                // =========================================

                console.log(
                    "Step 1: Creating course..."
                );

                const course =
                    await createCourse();

                if (
                    !course ||
                    !course.id
                ) {

                    throw new Error(
                        "Course created but course ID was not returned."
                    );
                }

                console.log(
                    "Course Created:",
                    course.id
                );

                // =========================================
                // 2. UPLOAD THUMBNAIL
                // =========================================

                console.log(
                    "Step 2: Uploading thumbnail..."
                );

                await uploadThumbnail(
                    course.id,
                    thumbnailFile
                );

                console.log(
                    "Thumbnail uploaded successfully."
                );

                // =========================================
                // 3. UPLOAD VIDEO / PDF
                // =========================================

                console.log(
                    "Step 3: Uploading resource..."
                );

                await uploadResource(
                    course.id,
                    resourceFile
                );

                console.log(
                    "Resource uploaded successfully."
                );

                // =========================================
                // SUCCESS
                // =========================================

                alert(
                    "Course created successfully!"
                );

                // Clear form
                addCourseForm.reset();

                // Reset price
                if (priceInput) {

                    priceInput.disabled =
                        true;

                    priceInput.required =
                        false;
                }

                // Reset file names
                if (thumbnailText) {

                    thumbnailText.textContent =
                        "Click to Upload Thumbnail";
                }

                if (fileText) {

                    fileText.textContent =
                        "Click to Upload Video / PDF";
                }

                // =========================================
                // GO TO TEACHER PAGE
                // =========================================

                window.location.href =
                    "teacher.html";

            } catch (err) {

                console.error(
                    "Create Course Error:",
                    err
                );

                alert(
                    err.message ||
                    "Something went wrong."
                );

                // Enable button again
                if (submitButton) {

                    submitButton.disabled =
                        false;

                    submitButton.textContent =
                        "Submit";
                }
            }
        }
    );

    // =====================================================
    // INIT
    // =====================================================

    showSection("courses");

    loadTeacherProfile();

    // Default price state
    if (courseTypeInput) {

        window.togglePriceField(
            courseTypeInput.value
        );
    }

});