document.addEventListener("DOMContentLoaded", () => {

    // =====================================================
    // API
    // =====================================================

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
    // SETTINGS / PROFILE
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
    // COURSE FORM
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
    // UPDATE PROFILE
    // =====================================================

    function openUpdateProfile(e) {

        if (e) {
            e.preventDefault();
        }

        window.location.href = "update_profile.html";
    }

    /*
     * যদি HTML-এ button থাকে:
     * id="openUpdateProfile"
     */
    document.addEventListener("click", e => {

        const button =
            e.target.closest("#openUpdateProfile");

        if (button) {
            openUpdateProfile(e);
        }

    });

    /*
     * যদি navigation-এ data-page="update-profile" থাকে
     */
    document.addEventListener("click", e => {

        const link =
            e.target.closest('[data-page="update-profile"]');

        if (link) {
            openUpdateProfile(e);
        }

    });

    // =====================================================
    // LOAD TEACHER PROFILE
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

            const data =
                await response.json();

            // -------------------------------
            // NAME
            // -------------------------------

            const fullName =
                `${data.first_name || ""} ${data.last_name || ""}`
                    .trim();

            if (teacherUserName) {

                teacherUserName.textContent =
                    fullName || "Teacher";
            }

            // -------------------------------
            // PROFILE IMAGE
            // -------------------------------

            if (teacherProfileImg) {

                teacherProfileImg.src =
                    data.profile_pic ||
                    "https://i.pravatar.cc/150?img=47";

                teacherProfileImg.onerror =
                    function () {

                        this.src =
                            "https://i.pravatar.cc/150?img=47";
                    };
            }

            // -------------------------------
            // PROFILE DETAILS
            // -------------------------------

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

        } catch (error) {

            console.error(
                "Teacher Profile Error:",
                error
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

        if (!priceInput) {
            return;
        }

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

        const fileName =
            input.files[0].name;

        if (
            input.id === "thumbnailInput" &&
            thumbnailText
        ) {

            thumbnailText.textContent =
                fileName;
        }

        if (
            input.id === "fileInput" &&
            fileText
        ) {

            fileText.textContent =
                fileName;
        }
    };

    // =====================================================
    // THUMBNAIL CHANGE
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

    function ext(file) {

        return file.name
            .split(".")
            .pop()
            .toLowerCase();
    }

    function nameOnly(file) {

        return file.name.replace(
            /\.[^/.]+$/,
            ""
        );
    }

    // =====================================================
    // PROGRESS BAR UI
    // =====================================================

    let progressContainer = null;

    function createProgressUI() {

        if (progressContainer) {
            return;
        }

        progressContainer =
            document.createElement("div");

        progressContainer.id =
            "courseUploadProgress";

        progressContainer.innerHTML = `

            <div class="course-progress-overlay">

                <div class="course-progress-box">

                    <div class="course-progress-spinner">
                        <div class="spinner"></div>
                    </div>

                    <h3 id="courseProgressTitle">
                        Creating Course...
                    </h3>

                    <p id="courseProgressStep">
                        Please wait...
                    </p>

                    <div class="course-progress-track">

                        <div
                            id="courseProgressFill"
                            class="course-progress-fill">
                        </div>

                    </div>

                    <div
                        id="courseProgressPercent"
                        class="course-progress-percent">
                        0%
                    </div>

                </div>

            </div>

        `;

        document.body.appendChild(
            progressContainer
        );

        const style =
            document.createElement("style");

        style.id =
            "course-progress-style";

        style.textContent = `

            .course-progress-overlay {

                position: fixed;

                inset: 0;

                background: rgba(0, 0, 0, 0.45);

                display: flex;

                align-items: center;

                justify-content: center;

                z-index: 99999;

                backdrop-filter: blur(3px);
            }

            .course-progress-box {

                width: min(430px, 90%);

                background: #ffffff;

                border-radius: 18px;

                padding: 32px;

                text-align: center;

                box-shadow:
                    0 20px 60px rgba(0, 0, 0, 0.18);
            }

            .course-progress-spinner {

                display: flex;

                justify-content: center;

                margin-bottom: 18px;
            }

            .spinner {

                width: 42px;

                height: 42px;

                border: 4px solid #dcefeb;

                border-top-color: #0f766e;

                border-radius: 50%;

                animation:
                    courseSpinner 0.8s linear infinite;
            }

            @keyframes courseSpinner {

                to {
                    transform: rotate(360deg);
                }

            }

            #courseProgressTitle {

                margin: 0 0 8px;

                color: #0b2942;

                font-size: 20px;

                font-weight: 700;
            }

            #courseProgressStep {

                margin: 0 0 20px;

                color: #64748b;

                font-size: 14px;
            }

            .course-progress-track {

                width: 100%;

                height: 12px;

                background: #e6f3f1;

                border-radius: 20px;

                overflow: hidden;
            }

            .course-progress-fill {

                width: 0%;

                height: 100%;

                background:
                    linear-gradient(
                        90deg,
                        #0f766e,
                        #159b91
                    );

                border-radius: 20px;

                transition:
                    width 0.25s ease;
            }

            .course-progress-percent {

                margin-top: 12px;

                color: #0f766e;

                font-size: 17px;

                font-weight: 800;
            }

        `;

        document.head.appendChild(style);
    }

    function showProgress() {

        createProgressUI();

        progressContainer.style.display =
            "block";

        updateProgress(
            0,
            "Creating Course...",
            "Please wait..."
        );
    }

    function updateProgress(
        percent,
        title,
        step
    ) {

        createProgressUI();

        const safePercent =
            Math.max(
                0,
                Math.min(
                    100,
                    Math.round(percent)
                )
            );

        const fill =
            document.getElementById(
                "courseProgressFill"
            );

        const percentText =
            document.getElementById(
                "courseProgressPercent"
            );

        const titleText =
            document.getElementById(
                "courseProgressTitle"
            );

        const stepText =
            document.getElementById(
                "courseProgressStep"
            );

        if (fill) {

            fill.style.width =
                `${safePercent}%`;
        }

        if (percentText) {

            percentText.textContent =
                `${safePercent}%`;
        }

        if (titleText) {

            titleText.textContent =
                title;
        }

        if (stepText) {

            stepText.textContent =
                step;
        }
    }

    function hideProgress() {

        if (progressContainer) {

            progressContainer.style.display =
                "none";
        }
    }

    // =====================================================
    // S3 UPLOAD WITH REAL PROGRESS
    // =====================================================

    async function uploadToS3(
        url,
        file,
        onProgress
    ) {

        if (!url) {

            throw new Error(
                `Upload URL was not returned for ${file.name}`
            );
        }

        await new Promise(
            (resolve, reject) => {

                const xhr =
                    new XMLHttpRequest();

                xhr.open(
                    "PUT",
                    url,
                    true
                );

                xhr.setRequestHeader(
                    "Content-Type",
                    file.type ||
                    "application/octet-stream"
                );

                xhr.upload.addEventListener(
                    "progress",
                    event => {

                        if (
                            event.lengthComputable &&
                            typeof onProgress === "function"
                        ) {

                            const percent =
                                (
                                    event.loaded /
                                    event.total
                                ) * 100;

                            onProgress(
                                percent
                            );
                        }
                    }
                );

                xhr.onload = () => {

                    if (
                        xhr.status >= 200 &&
                        xhr.status < 300
                    ) {

                        if (
                            typeof onProgress ===
                            "function"
                        ) {

                            onProgress(100);
                        }

                        resolve();

                    } else {

                        reject(
                            new Error(
                                `Failed to upload ${file.name}`
                            )
                        );
                    }
                };

                xhr.onerror = () => {

                    reject(
                        new Error(
                            `Failed to upload ${file.name}`
                        )
                    );
                };

                xhr.onabort = () => {

                    reject(
                        new Error(
                            `Upload cancelled for ${file.name}`
                        )
                    );
                };

                xhr.send(file);
            }
        );
    }

    // =====================================================
    // MARK MEDIA READY
    // =====================================================

    async function markReady(
        courseId,
        mediaId
    ) {

        if (!mediaId) {

            throw new Error(
                "Media ID was not returned by server."
            );
        }

        const response =
            await fetch(
                `${API_BASE}/courses/${courseId}/media/${mediaId}/status`,
                {
                    method: "POST",

                    headers: {
                        Authorization:
                            `Bearer ${token}`,

                        Accept:
                            "application/json"
                    }
                }
            );

        if (!response.ok) {

            let data = {};

            try {

                data =
                    await response.json();

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

        if (
            typeof data.detail ===
            "string"
        ) {

            return data.detail;
        }

        if (
            Array.isArray(data.detail)
        ) {

            return data.detail
                .map(item => {

                    if (
                        typeof item ===
                        "string"
                    ) {

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
            typeof data.detail ===
            "object"
        ) {

            return JSON.stringify(
                data.detail
            );
        }

        if (
            typeof data.message ===
            "string"
        ) {

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

        const response =
            await fetch(
                `${API_BASE}/courses/`,
                {
                    method: "POST",

                    headers:
                        jsonHeaders,

                    body:
                        JSON.stringify(
                            courseData
                        )
                }
            );

        let data = {};

        try {

            data =
                await response.json();

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

        const allowedTypes = [
            "image/jpeg",
            "image/png"
        ];

        if (
            !allowedTypes.includes(
                file.type
            )
        ) {

            throw new Error(
                "Thumbnail must be JPG, JPEG or PNG."
            );
        }

        const requestBody = {

            category:
                "thumbnail",

            media_type:
                file.type,

            file_name:
                nameOnly(file),

            file_extension:
                ext(file)
        };

        console.log(
            "Thumbnail Upload Request:",
            requestBody
        );

        const response =
            await fetch(
                `${API_BASE}/courses/${courseId}/media/thumbnail/upload`,
                {
                    method: "POST",

                    headers:
                        jsonHeaders,

                    body:
                        JSON.stringify(
                            requestBody
                        )
                }
            );

        let data = {};

        try {

            data =
                await response.json();

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

        // -------------------------------
        // REAL UPLOAD PROGRESS
        // 20% → 50%
        // -------------------------------

        await uploadToS3(
            data.upload_url,
            file,
            percent => {

                updateProgress(
                    20 + (
                        percent * 0.30
                    ),

                    "Uploading Thumbnail...",

                    `${Math.round(percent)}% uploaded`
                );
            }
        );

        updateProgress(
            50,
            "Thumbnail Uploaded",
            "Thumbnail upload complete"
        );

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

        // -------------------------------
        // VIDEO
        // -------------------------------

        if (
            selectedType === "video"
        ) {

            if (
                file.type !==
                "video/mp4"
            ) {

                throw new Error(
                    "Please upload an MP4 video for Video resource type."
                );
            }

            mediaType =
                "video/mp4";
        }

        // -------------------------------
        // DOCUMENT
        // -------------------------------

        else if (
            selectedType ===
            "document"
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

            category:
                "resource",

            media_type:
                mediaType,

            file_name:
                nameOnly(file),

            file_extension:
                ext(file)
        };

        console.log(
            "Resource Upload Request:",
            requestBody
        );

        const response =
            await fetch(
                `${API_BASE}/courses/${courseId}/media/resource/upload`,
                {
                    method: "POST",

                    headers:
                        jsonHeaders,

                    body:
                        JSON.stringify(
                            requestBody
                        )
                }
            );

        let data = {};

        try {

            data =
                await response.json();

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

        // -------------------------------
        // REAL UPLOAD PROGRESS
        // 55% → 90%
        // -------------------------------

        await uploadToS3(
            data.upload_url,
            file,
            percent => {

                updateProgress(
                    55 + (
                        percent * 0.35
                    ),

                    "Uploading Course Resource...",

                    `${Math.round(percent)}% uploaded`
                );
            }
        );

        updateProgress(
            90,
            "Resource Uploaded",
            "Course resource upload complete"
        );

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

            // -------------------------------
            // PREVENT DOUBLE SUBMIT
            // -------------------------------

            if (submitButton) {

                submitButton.disabled =
                    true;

                submitButton.textContent =
                    "Creating Course...";
            }

            try {

                // -------------------------------
                // START PROGRESS
                // -------------------------------

                showProgress();

                updateProgress(
                    5,
                    "Checking Course Information...",
                    "Validating your course details"
                );

                // -------------------------------
                // COURSE NAME
                // -------------------------------

                if (
                    !courseNameInput.value.trim()
                ) {

                    throw new Error(
                        "Please enter Course Name."
                    );
                }

                // -------------------------------
                // COURSE DETAILS
                // -------------------------------

                if (
                    !courseDetailsInput.value.trim()
                ) {

                    throw new Error(
                        "Please enter Course Details."
                    );
                }

                // -------------------------------
                // LANGUAGE
                // -------------------------------

                if (
                    !languageInput.value
                ) {

                    throw new Error(
                        "Please select Language."
                    );
                }

                // -------------------------------
                // COURSE TYPE
                // -------------------------------

                if (
                    !courseTypeInput.value
                ) {

                    throw new Error(
                        "Please select Course Type."
                    );
                }

                // -------------------------------
                // PRICE
                // -------------------------------

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

                // -------------------------------
                // RESOURCE TYPE
                // -------------------------------

                if (
                    !resourceTypeInput ||
                    !resourceTypeInput.value
                ) {

                    throw new Error(
                        "Please select Resource Type."
                    );
                }

                // -------------------------------
                // THUMBNAIL
                // -------------------------------

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

                // -------------------------------
                // RESOURCE
                // -------------------------------

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

                // -------------------------------
                // RESOURCE VALIDATION
                // -------------------------------

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

                // -------------------------------
                // VALIDATION COMPLETE
                // -------------------------------

                updateProgress(
                    10,
                    "Creating Course...",
                    "Sending course information to server"
                );

                // =================================================
                // 1. CREATE COURSE
                // =================================================

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

                updateProgress(
                    20,
                    "Course Created",
                    "Preparing thumbnail upload..."
                );

                // =================================================
                // 2. UPLOAD THUMBNAIL
                // =================================================

                await uploadThumbnail(
                    course.id,
                    thumbnailFile
                );

                console.log(
                    "Thumbnail uploaded successfully."
                );

                // =================================================
                // 3. UPLOAD VIDEO / PDF
                // =================================================

                updateProgress(
                    55,
                    "Uploading Course Resource...",
                    "Preparing video/PDF upload..."
                );

                await uploadResource(
                    course.id,
                    resourceFile
                );

                console.log(
                    "Resource uploaded successfully."
                );

                // =================================================
                // FINALIZING
                // =================================================

                updateProgress(
                    95,
                    "Finalizing Course...",
                    "Almost finished..."
                );

                await new Promise(
                    resolve =>
                        setTimeout(
                            resolve,
                            500
                        )
                );

                updateProgress(
                    100,
                    "Course Created Successfully!",
                    "Your course is ready."
                );

                // -------------------------------
                // WAIT
                // -------------------------------

                await new Promise(
                    resolve =>
                        setTimeout(
                            resolve,
                            900
                        )
                );

                // -------------------------------
                // RESET FORM
                // -------------------------------

                addCourseForm.reset();

                if (priceInput) {

                    priceInput.disabled =
                        true;

                    priceInput.required =
                        false;
                }

                if (thumbnailText) {

                    thumbnailText.textContent =
                        "Click to Upload Thumbnail";
                }

                if (fileText) {

                    fileText.textContent =
                        "Click to Upload Video / PDF";
                }

                hideProgress();

                // -------------------------------
                // SUCCESS MESSAGE
                // -------------------------------

                alert(
                    "Course created successfully!"
                );

                // -------------------------------
                // GO TEACHER DASHBOARD
                // -------------------------------

                window.location.href =
                    "teacher.html";

            } catch (err) {

                console.error(
                    "Create Course Error:",
                    err
                );

                hideProgress();

                alert(
                    err.message ||
                    "Something went wrong."
                );

                // -------------------------------
                // ENABLE BUTTON AGAIN
                // -------------------------------

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

    // -------------------------------
    // DEFAULT PRICE STATE
    // -------------------------------

    if (courseTypeInput) {

        window.togglePriceField(
            courseTypeInput.value
        );
    }

});
