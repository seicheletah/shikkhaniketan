/* ===== TAGS (list + label helper) – now inside this file ===== */
/* =========================================================
   tags.js
   Shared by add_course.html and explore.html.
   Contains every tag value accepted by the API (course_tags /
   search "tags" query) and a helper that turns a raw value like
   "web_development" into a nice label like "Web Development".
   Load this file BEFORE add_course.js / explore.js.
   ========================================================= */

window.SKILLHUB_TAGS = [
  "diploma","polytechnic_diploma","ba","bsc","bcom","btech","be","bca","bba","barch","bfa","bed",
  "mbbs","bds","bams","bhms","bpharma","bsc_nursing","llb","ba_llb","bba_llb","ma","msc","mcom",
  "mtech","me","mca","mba","md","ms_medical","llm","med","phd",
  "class_1","class_2","class_3","class_4","class_5","class_6","class_7","class_8","class_9",
  "class_10","class_11","class_12",
  "mathematics","algebra","geometry","calculus","trigonometry","statistics","discrete_math","logic",
  "computer_science","software_engineering","data_science","artificial_intelligence","cybersecurity",
  "web_development","mobile_development","data_structures","python","javascript","typescript","java",
  "c_sharp","c_plus_plus","go_lang","rust","swift","kotlin","php","ruby","sql",
  "physics","mechanics","thermodynamics","quantum_physics","astrophysics","chemistry","organic_chemistry",
  "inorganic_chemistry","biochemistry","biology","genetics","microbiology","ecology","astronomy",
  "earth_science","environmental_science",
  "psychology","cognitive_psychology","clinical_psychology","economics","microeconomics","macroeconomics",
  "sociology","political_science","anthropology","history","ancient_history","modern_history",
  "philosophy","ethics","literature","linguistics","creative_writing",
  "finance","corporate_finance","investment_banking","accounting","taxation","management",
  "project_management","human_resources","marketing","digital_marketing","seo_sem","entrepreneurship",
  "photography","music","music_theory","music_production","visual_arts","graphic_design","fine_arts",
  "electrical_engineering","mechanical_engineering","civil_engineering","architecture",
  "medicine","anatomy","pharmacology","nursing","law","constitutional_law","corporate_law",
  "education","pedagogy"
];

// Values that should be shown in UPPER CASE (degree names / acronyms)
const UPPER_TAGS = new Set([
  "ba","bsc","bcom","btech","be","bca","bba","barch","bfa","bed","mbbs","bds","bams","bhms",
  "bpharma","llb","ma","msc","mcom","mtech","me","mca","mba","md","llm","med","phd","sql","php"
]);

// Special labels that cannot be produced by the simple rule
const SPECIAL_TAG_LABELS = {
  c_plus_plus: "C++",
  c_sharp: "C#",
  go_lang: "Go",
  ba_llb: "BA LLB",
  bba_llb: "BBA LLB",
  bsc_nursing: "BSc Nursing",
  ms_medical: "MS (Medical)",
  seo_sem: "SEO / SEM",
  polytechnic_diploma: "Polytechnic Diploma"
};

window.tagLabel = function (tag) {
  if (SPECIAL_TAG_LABELS[tag]) return SPECIAL_TAG_LABELS[tag];
  if (UPPER_TAGS.has(tag)) return tag.toUpperCase();
  // "class_10" -> "Class 10", "web_development" -> "Web Development"
  return tag.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
};


/* =========================================================
   add_course.js  (full file – replace your old one)

   What this file does:
   1. Checks login (token) and loads the teacher profile
   2. Switches between "Courses" and "Settings" sections
   3. Builds the searchable "Course Tags" multi-select dropdown
   4. Validates the form
   5. Calls the API in this order:
        POST /courses/                                  -> create course (ALL fields)
        POST /courses/{id}/media/thumbnail/upload       -> get upload url, upload to S3
        POST /courses/{id}/media/{mediaId}/status       -> mark thumbnail ready
        POST /courses/{id}/media/resource/upload        -> get upload url, upload to S3
        POST /courses/{id}/media/{mediaId}/status       -> mark resource ready
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    // ---------------------------------------------------------
    // CONFIG
    // ---------------------------------------------------------
    const API_BASE = "http://127.0.0.1:8000/api/v1";
    const token = localStorage.getItem("access_token");

    // Not logged in -> go to login page
    if (!token) {
        window.location.href = "login.html";
        return;
    }

    const jsonHeaders = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json"
    };

    // ---------------------------------------------------------
    // SMALL HELPER: get element by id
    // ---------------------------------------------------------
    const $ = id => document.getElementById(id);

    // Top bar + navigation
    const topBar = document.querySelector(".top-bar");
    const coursesSection = $("courses");
    const settingsSection = $("settings");

    // Course form fields
    const addCourseForm = $("addCourseForm");
    const courseNameInput = $("courseName");
    const courseDetailsInput = $("courseDetails");
    const languageInput = $("language");
    const courseTypeInput = $("courseType");
    const priceInput = $("price");
    const resourceTypeInput = $("resourceType");
    const thumbnailInput = $("thumbnailInput");
    const fileInput = $("fileInput");
    const thumbnailText = $("thumbnailText");
    const fileText = $("fileText");

    // =========================================================
    // SECTION SWITCHING (Courses <-> Settings)
    // =========================================================
    function showSection(section) {
        coursesSection.style.display = section === "courses" ? "block" : "none";
        settingsSection.style.display = section === "settings" ? "block" : "none";

        if (section === "settings") {
            topBar?.classList.add("hide-search");
            loadTeacherProfile();
        } else {
            topBar?.classList.remove("hide-search");
        }
    }

    document.querySelector('[data-page="courses"]')?.addEventListener("click", e => {
        e.preventDefault();
        showSection("courses");
    });

    document.querySelector('[data-page="settings"]')?.addEventListener("click", e => {
        e.preventDefault();
        showSection("settings");
    });

    // Logout: clear everything and go to login
    document.querySelector('[data-page="logout"]')?.addEventListener("click", e => {
        e.preventDefault();
        localStorage.clear();
        window.location.href = "login.html";
    });

    // "Update Profile" button
    $("openUpdateProfile")?.addEventListener("click", () => {
        window.location.href = "update_profile.html";
    });

    // =========================================================
    // LOAD TEACHER PROFILE  (GET /teachers/me)
    // =========================================================
    async function loadTeacherProfile() {
        try {
            const res = await fetch(`${API_BASE}/teachers/me`, {
                headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }
            });

            // Token expired -> login again
            if (res.status === 401) {
                localStorage.clear();
                window.location.href = "login.html";
                return;
            }
            if (!res.ok) return;

            const data = await res.json();

            // Top bar name + picture
            const fullName = `${data.first_name || ""} ${data.last_name || ""}`.trim();
            $("teacherUserName").textContent = fullName || "Teacher";

            const img = $("teacherProfileImg");
            img.src = data.profile_pic || "https://i.pravatar.cc/150?img=47";
            img.onerror = function () { this.src = "https://i.pravatar.cc/150?img=47"; };

            // Settings page details
            $("teacherFirstName").textContent = data.first_name || "-";
            $("teacherLastName").textContent = data.last_name || "-";
            $("teacherEmail").textContent = data.user?.email_id || "-";
            $("teacherPhone").textContent = data.phone_no || "-";
            $("teacherGender").textContent = data.gender || "-";
            $("teacherDob").textContent = data.date_of_birth || "-";
            $("teacherAddress").textContent = data.address || "-";
            $("teacherAbout").textContent = data.about || "-";

        } catch (err) {
            console.error("Teacher profile error:", err);
        }
    }

    // =========================================================
    // PRICE FIELD: disabled when course is Free
    // (called from the HTML onchange attribute)
    // =========================================================
    window.togglePriceField = value => {
        if (value === "paid") {
            priceInput.disabled = false;
            priceInput.required = true;
        } else {
            priceInput.disabled = true;
            priceInput.required = false;
            priceInput.value = "";
        }
    };

    // =========================================================
    // FILE NAME LABELS inside the upload boxes
    // =========================================================
    thumbnailInput.addEventListener("change", () => {
        thumbnailText.textContent = thumbnailInput.files.length
            ? thumbnailInput.files[0].name
            : "Click to Upload Thumbnail";
    });

    fileInput.addEventListener("change", () => {
        fileText.textContent = fileInput.files.length
            ? fileInput.files[0].name
            : "Click to Upload Video / PDF";
    });

    // =========================================================
    // COURSE TAGS DROPDOWN (searchable multi-select)
    // =========================================================
    const selectedTags = new Set();           // holds raw tag values, e.g. "mba"

    const tagDropdown = $("tagDropdown");
    const tagToggle = $("tagDropdownToggle");
    const tagLabelEl = $("tagDropdownLabel");
    const tagSearch = $("tagSearchInput");
    const tagOptions = $("tagOptions");
    const selectedTagsBox = $("selectedTags");

    // Draw the checkbox list (filtered by the search text)
    function renderTagOptions() {
        const q = tagSearch.value.trim().toLowerCase();

        const list = window.SKILLHUB_TAGS.filter(tag =>
            tagLabel(tag).toLowerCase().includes(q) || tag.includes(q)
        );

        if (!list.length) {
            tagOptions.innerHTML = `<div class="tag-empty">No tag found</div>`;
            return;
        }

        tagOptions.innerHTML = list.map(tag => `
            <label class="tag-option">
                <input type="checkbox" value="${tag}" ${selectedTags.has(tag) ? "checked" : ""}>
                <span>${tagLabel(tag)}</span>
            </label>
        `).join("");
    }

    // Draw the chips + update the button text
    function renderSelectedTags() {
        tagLabelEl.textContent = selectedTags.size
            ? `${selectedTags.size} tag(s) selected`
            : "Select tags";

        selectedTagsBox.innerHTML = [...selectedTags].map(tag => `
            <span class="tag-chip">
                ${tagLabel(tag)}
                <button type="button" data-remove="${tag}" aria-label="Remove">&times;</button>
            </span>
        `).join("");
    }

    // Open / close the panel
    tagToggle.addEventListener("click", () => {
        tagDropdown.classList.toggle("open");
        if (tagDropdown.classList.contains("open")) tagSearch.focus();
    });

    // Click outside -> close the panel
    document.addEventListener("click", e => {
        if (!tagDropdown.contains(e.target)) tagDropdown.classList.remove("open");
    });

    // Typing in the search box filters the list
    tagSearch.addEventListener("input", renderTagOptions);

    // Check / uncheck a tag
    tagOptions.addEventListener("change", e => {
        if (e.target.type !== "checkbox") return;
        e.target.checked ? selectedTags.add(e.target.value) : selectedTags.delete(e.target.value);
        renderSelectedTags();
    });

    // Click "x" on a chip -> remove that tag
    selectedTagsBox.addEventListener("click", e => {
        const tag = e.target.dataset.remove;
        if (!tag) return;
        selectedTags.delete(tag);
        renderSelectedTags();
        renderTagOptions();
    });

    // =========================================================
    // FILE HELPERS
    // =========================================================
    const ext = file => file.name.split(".").pop().toLowerCase();
    const nameOnly = file => file.name.replace(/\.[^/.]+$/, "");

    // =========================================================
    // PROGRESS POPUP (created once, styles injected from JS)
    // =========================================================
    let progressEl = null;

    function createProgressUI() {
        if (progressEl) return;

        progressEl = document.createElement("div");
        progressEl.innerHTML = `
            <div class="course-progress-overlay">
                <div class="course-progress-box">
                    <div class="course-progress-spinner"><div class="spinner"></div></div>
                    <h3 id="courseProgressTitle">Creating Course...</h3>
                    <p id="courseProgressStep">Please wait...</p>
                    <div class="course-progress-track">
                        <div id="courseProgressFill" class="course-progress-fill"></div>
                    </div>
                    <div id="courseProgressPercent" class="course-progress-percent">0%</div>
                </div>
            </div>`;
        document.body.appendChild(progressEl);

        const style = document.createElement("style");
        style.textContent = `
            .course-progress-overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;
                align-items:center;justify-content:center;z-index:99999;backdrop-filter:blur(3px)}
            .course-progress-box{width:min(430px,90%);background:#fff;border-radius:18px;padding:32px;
                text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.18)}
            .course-progress-spinner{display:flex;justify-content:center;margin-bottom:18px}
            .spinner{width:42px;height:42px;border:4px solid #dcefeb;border-top-color:#0f766e;
                border-radius:50%;animation:courseSpinner .8s linear infinite}
            @keyframes courseSpinner{to{transform:rotate(360deg)}}
            #courseProgressTitle{margin:0 0 8px;color:#0b2942;font-size:20px;font-weight:700}
            #courseProgressStep{margin:0 0 20px;color:#64748b;font-size:14px}
            .course-progress-track{width:100%;height:12px;background:#e6f3f1;border-radius:20px;overflow:hidden}
            .course-progress-fill{width:0;height:100%;background:linear-gradient(90deg,#0f766e,#159b91);
                border-radius:20px;transition:width .25s ease}
            .course-progress-percent{margin-top:12px;color:#0f766e;font-size:17px;font-weight:800}`;
        document.head.appendChild(style);
    }

    function updateProgress(percent, title, step) {
        createProgressUI();
        progressEl.style.display = "block";
        const p = Math.max(0, Math.min(100, Math.round(percent)));
        $("courseProgressFill").style.width = `${p}%`;
        $("courseProgressPercent").textContent = `${p}%`;
        $("courseProgressTitle").textContent = title;
        $("courseProgressStep").textContent = step;
    }

    function hideProgress() {
        if (progressEl) progressEl.style.display = "none";
    }

    // =========================================================
    // API ERROR -> readable text (handles FastAPI 422 format)
    // =========================================================
    function getApiErrorMessage(data, fallback) {
        if (!data) return fallback;
        if (typeof data.detail === "string") return data.detail;
        if (Array.isArray(data.detail)) {
            return data.detail
                .map(i => {
                    if (typeof i === "string") return i;
                    // Show WHICH field failed, e.g. "course_tags: Value error..."
                    const field = Array.isArray(i.loc) ? i.loc.filter(x => x !== "body").join(".") : "";
                    return (field ? field + ": " : "") + (i.msg || i.message || JSON.stringify(i));
                })
                .join(", ");
        }
        if (data.detail && typeof data.detail === "object") return JSON.stringify(data.detail);
        if (typeof data.message === "string") return data.message;
        return fallback;
    }

    // Safe JSON parse (response may be empty)
    async function readJson(res) {
        try { return await res.json(); } catch { return {}; }
    }

    // =========================================================
    // UPLOAD A FILE TO S3 (PUT to the presigned url) with progress
    // =========================================================
    function uploadToS3(url, file, onProgress) {
        return new Promise((resolve, reject) => {
            if (!url) return reject(new Error(`Upload URL was not returned for ${file.name}`));

            const xhr = new XMLHttpRequest();
            xhr.open("PUT", url, true);
            xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");

            xhr.upload.addEventListener("progress", ev => {
                if (ev.lengthComputable && onProgress) onProgress((ev.loaded / ev.total) * 100);
            });

            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    onProgress?.(100);
                    resolve();
                } else {
                    reject(new Error(`Failed to upload ${file.name}`));
                }
            };
            xhr.onerror = () => reject(new Error(`Failed to upload ${file.name}`));
            xhr.onabort = () => reject(new Error(`Upload cancelled for ${file.name}`));

            xhr.send(file);
        });
    }

    // =========================================================
    // MARK MEDIA AS READY
    // =========================================================
    async function markReady(courseId, mediaId) {
        if (!mediaId) throw new Error("Media ID was not returned by server.");

        const res = await fetch(`${API_BASE}/courses/${courseId}/media/${mediaId}/status`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }
        });

        if (!res.ok) {
            const data = await readJson(res);
            throw new Error(getApiErrorMessage(data, "Media status update failed."));
        }
    }

    // =========================================================
    // STEP 1 – CREATE COURSE (sends the fields the server accepts)
    // =========================================================
    async function createCourse() {
        const isPaid = courseTypeInput.value === "paid";

        const courseData = {
            course_name: courseNameInput.value.trim(),
            course_details: courseDetailsInput.value.trim(),
            course_language: languageInput.value,            // english | bengali | hindi
            course_resource_type: resourceTypeInput.value,   // video | document
            course_paid: isPaid,
            course_price: isPaid ? Number(priceInput.value) : 0,
            course_price_currency: "INR",
            course_tags: [...selectedTags]                   // from the dropdown
            // NOTE: total_enrollment, total_comment, total_rating and avg_rating
            // are NOT sent. The server rejects them on create ("needs to be none")
            // because it manages these counters itself.
        };

        const res = await fetch(`${API_BASE}/courses/`, {
            method: "POST",
            headers: jsonHeaders,
            body: JSON.stringify(courseData)
        });

        const data = await readJson(res);
        if (!res.ok) throw new Error(getApiErrorMessage(data, "Course creation failed."));
        return data;
    }

    // =========================================================
    // STEP 2 – UPLOAD THUMBNAIL (progress 20% -> 50%)
    // =========================================================
    async function uploadThumbnail(courseId, file) {
        const res = await fetch(`${API_BASE}/courses/${courseId}/media/thumbnail/upload`, {
            method: "POST",
            headers: jsonHeaders,
            body: JSON.stringify({
                category: "thumbnail",
                media_type: file.type,
                file_name: nameOnly(file),
                file_extension: ext(file)
            })
        });

        const data = await readJson(res);
        if (!res.ok) throw new Error(getApiErrorMessage(data, "Thumbnail upload failed."));
        if (!data.upload_url) throw new Error("Thumbnail upload URL was not returned by server.");

        await uploadToS3(data.upload_url, file, pct =>
            updateProgress(20 + pct * 0.3, "Uploading Thumbnail...", `${Math.round(pct)}% uploaded`)
        );

        updateProgress(50, "Thumbnail Uploaded", "Thumbnail upload complete");
        await markReady(courseId, data.media_id);
    }

    // =========================================================
    // STEP 3 – UPLOAD VIDEO / PDF (progress 55% -> 90%)
    // =========================================================
    async function uploadResource(courseId, file) {
        const mediaType = resourceTypeInput.value === "video" ? "video/mp4" : "application/pdf";

        const res = await fetch(`${API_BASE}/courses/${courseId}/media/resource/upload`, {
            method: "POST",
            headers: jsonHeaders,
            body: JSON.stringify({
                category: "resource",
                media_type: mediaType,
                file_name: nameOnly(file),
                file_extension: ext(file)
            })
        });

        const data = await readJson(res);
        if (!res.ok) throw new Error(getApiErrorMessage(data, "Resource upload failed."));
        if (!data.upload_url) throw new Error("Resource upload URL was not returned by server.");

        await uploadToS3(data.upload_url, file, pct =>
            updateProgress(55 + pct * 0.35, "Uploading Course Resource...", `${Math.round(pct)}% uploaded`)
        );

        updateProgress(90, "Resource Uploaded", "Course resource upload complete");
        await markReady(courseId, data.media_id);
    }

    // =========================================================
    // FORM VALIDATION (throws an Error with a friendly message)
    // =========================================================
    function validateForm() {
        if (!courseNameInput.value.trim()) throw new Error("Please enter Course Name.");
        if (!courseDetailsInput.value.trim()) throw new Error("Please enter Course Details.");
        if (!languageInput.value) throw new Error("Please select Language.");

        if (courseTypeInput.value === "paid" &&
            (!priceInput.value || Number(priceInput.value) <= 0)) {
            throw new Error("Please enter a valid course price.");
        }

        if (!resourceTypeInput.value) throw new Error("Please select Resource Type.");
        if (selectedTags.size === 0) throw new Error("Please select at least one Course Tag.");

        // Thumbnail must be JPG / PNG
        if (!thumbnailInput.files.length) throw new Error("Please upload a course thumbnail.");
        const thumb = thumbnailInput.files[0];
        if (!["image/jpeg", "image/png"].includes(thumb.type)) {
            throw new Error("Thumbnail must be JPG, JPEG or PNG.");
        }

        // Resource must match the selected resource type
        if (!fileInput.files.length) throw new Error("Please upload a course video or PDF.");
        const resource = fileInput.files[0];
        if (resourceTypeInput.value === "video" && resource.type !== "video/mp4") {
            throw new Error("Resource Type is Video, so please upload an MP4 video.");
        }
        if (resourceTypeInput.value === "document" && resource.type !== "application/pdf") {
            throw new Error("Resource Type is Document, so please upload a PDF file.");
        }
    }

    // =========================================================
    // SUBMIT HANDLER
    // =========================================================
    addCourseForm.addEventListener("submit", async e => {
        e.preventDefault();

        const submitButton = addCourseForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;                 // prevent double submit
        submitButton.textContent = "Creating Course...";

        try {
            updateProgress(5, "Checking Course Information...", "Validating your course details");
            validateForm();

            updateProgress(10, "Creating Course...", "Sending course information to server");
            const course = await createCourse();
            if (!course?.id) throw new Error("Course created but course ID was not returned.");

            updateProgress(20, "Course Created", "Preparing thumbnail upload...");
            await uploadThumbnail(course.id, thumbnailInput.files[0]);

            updateProgress(55, "Uploading Course Resource...", "Preparing video/PDF upload...");
            await uploadResource(course.id, fileInput.files[0]);

            updateProgress(95, "Finalizing Course...", "Almost finished...");
            await new Promise(r => setTimeout(r, 500));
            updateProgress(100, "Course Created Successfully!", "Your course is ready.");
            await new Promise(r => setTimeout(r, 900));

            // Reset the form + custom parts
            addCourseForm.reset();
            selectedTags.clear();
            renderSelectedTags();
            renderTagOptions();
            window.togglePriceField(courseTypeInput.value);
            thumbnailText.textContent = "Click to Upload Thumbnail";
            fileText.textContent = "Click to Upload Video / PDF";

            hideProgress();
            alert("Course created successfully!");
            window.location.href = "teacher.html";

        } catch (err) {
            console.error("Create Course Error:", err);
            hideProgress();
            alert(err.message || "Something went wrong.");
            submitButton.disabled = false;
            submitButton.textContent = "Submit";
        }
    });

    // =========================================================
    // INIT
    // =========================================================
    renderTagOptions();
    renderSelectedTags();
    showSection("courses");
    loadTeacherProfile();
    window.togglePriceField(courseTypeInput.value);
});


/* =========================================================
   TAGS DROPDOWN STYLES
   Injected from JS, so no extra CSS file is needed.
   ========================================================= */
(function () {
  const style = document.createElement("style");
  style.textContent = `
/* =========================================================
   tags_dropdown.css
   NEW file – only styles the "Course Tags" multi-select on the
   Add Course page. Your add_course.css stays exactly as it is.
   ========================================================= */

.tag-hint {
    font-weight: 500;
    color: var(--text-muted);
    font-size: 12px;
}

.tag-dropdown {
    position: relative;
}

/* Button that looks like the other inputs */
.tag-dropdown-toggle {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    border-radius: 10px;
    border: 1px solid #d3e7e3;
    background: #f7fcfb;
    font-size: 14px;
    color: var(--text-dark);
    cursor: pointer;
    transition: var(--transition);
}

.tag-dropdown.open .tag-dropdown-toggle {
    border-color: var(--teal-primary);
    background: #fff;
    box-shadow: 0 0 0 3px rgba(13, 104, 96, 0.08);
}

.tag-dropdown.open .tag-dropdown-toggle i {
    transform: rotate(180deg);
}

/* Floating panel */
.tag-dropdown-panel {
    display: none;
    position: absolute;
    left: 0;
    right: 0;
    top: calc(100% + 6px);
    background: #fff;
    border: 1px solid #d3e7e3;
    border-radius: 12px;
    box-shadow: 0 12px 30px rgba(13, 104, 96, 0.15);
    z-index: 50;
    padding: 10px;
}

.tag-dropdown.open .tag-dropdown-panel {
    display: block;
}

.tag-search-input {
    width: 100%;
    padding: 10px 14px;
    border-radius: 8px;
    border: 1px solid #d3e7e3;
    background: #f7fcfb;
    font-size: 14px;
    outline: none;
    margin-bottom: 8px;
}

.tag-search-input:focus {
    border-color: var(--teal-primary);
}

/* Scrollable list of checkboxes */
.tag-options {
    max-height: 240px;
    overflow-y: auto;
}

.tag-option {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border-radius: 8px;
    font-size: 14px;
    cursor: pointer;
}

.tag-option:hover {
    background: var(--teal-light);
}

.tag-option input {
    accent-color: var(--teal-primary);
    width: 16px;
    height: 16px;
}

.tag-empty {
    padding: 14px;
    text-align: center;
    color: var(--text-muted);
    font-size: 13px;
}

/* Chips for selected tags */
.selected-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.tag-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: var(--teal-light);
    color: var(--teal-primary);
    border: 1px solid #b2ded7;
    border-radius: 20px;
    padding: 5px 12px;
    font-size: 12px;
    font-weight: 700;
}

.tag-chip button {
    border: none;
    background: none;
    color: var(--teal-primary);
    cursor: pointer;
    font-size: 14px;
    line-height: 1;
}

`;
  document.head.appendChild(style);
})();