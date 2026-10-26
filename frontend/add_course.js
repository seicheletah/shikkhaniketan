/* ==========================================================
   add_course.js  (full file - replace your old one)

   Runs every time add_course.html is loaded INTO the teacher
   dashboard. What it does:
   1. Builds the searchable "Course Tags" multi-select
   2. Validates the form
   3. Calls the API in this order:
        POST /courses/                                 -> create course
        POST /courses/{id}/media/thumbnail/upload      -> upload url, upload to S3
        POST /courses/{id}/media/{mediaId}/status      -> thumbnail ready
        POST /courses/{id}/media/resource/upload       -> upload url, upload to S3
        POST /courses/{id}/media/{mediaId}/status      -> resource ready
   4. Goes back to the teacher courses page (inside the dashboard)

   NOTE: sidebar, top bar, Settings and logout are now handled by
   teacher.js, so all of that code was removed from here.
   ========================================================== */
(function () {

    const root = document.getElementById('ac-wrapper');
    if (!root) return; // page was replaced already

    const API_BASE = 'http://127.0.0.1:8000/api/v1';
    const token = localStorage.getItem('access_token');

    if (!token) {
        window.location.replace('login.html');
        return;
    }

    const jsonHeaders = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
    };

    const $ = id => document.getElementById(id);

    // ---------------------------------------------------------
    // TAGS (values accepted by the API) + label helper
    // ---------------------------------------------------------
    const SKILLHUB_TAGS = [
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

    const UPPER_TAGS = new Set([
        "ba","bsc","bcom","btech","be","bca","bba","barch","bfa","bed","mbbs","bds","bams","bhms",
        "bpharma","llb","ma","msc","mcom","mtech","me","mca","mba","md","llm","med","phd","sql","php"
    ]);

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

    function tagLabel(tag) {
        if (SPECIAL_TAG_LABELS[tag]) return SPECIAL_TAG_LABELS[tag];
        if (UPPER_TAGS.has(tag)) return tag.toUpperCase();
        return tag.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    }

    // ---------------------------------------------------------
    // ELEMENTS
    // ---------------------------------------------------------
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
    const submitBtn = $("acSubmitBtn");

    // Back to the teacher courses page (inside the dashboard)
    function goToCourses() {
        if (typeof window.loadDashboardPage === "function") {
            window.loadDashboardPage("teacher_courses.html");
        } else {
            window.location.href = "teacher.html";
        }
    }

    $("acCancelBtn").addEventListener("click", goToCourses);

    // ---------------------------------------------------------
    // PRICE FIELD: disabled when the course is Free
    // ---------------------------------------------------------
    function togglePriceField() {
        const paid = courseTypeInput.value === "paid";
        priceInput.disabled = !paid;
        if (!paid) priceInput.value = "";
    }
    courseTypeInput.addEventListener("change", togglePriceField);

    // ---------------------------------------------------------
    // FILE NAME LABELS inside the upload boxes
    // ---------------------------------------------------------
    thumbnailInput.addEventListener("change", () => {
        thumbnailText.textContent = thumbnailInput.files.length
            ? thumbnailInput.files[0].name : "Click to Upload Thumbnail";
    });

    fileInput.addEventListener("change", () => {
        fileText.textContent = fileInput.files.length
            ? fileInput.files[0].name : "Click to Upload Video / PDF";
    });

    // ---------------------------------------------------------
    // COURSE TAGS DROPDOWN (searchable multi-select)
    // ---------------------------------------------------------
    const selectedTags = new Set();

    const tagDropdown = $("tagDropdown");
    const tagToggle = $("tagDropdownToggle");
    const tagLabelEl = $("tagDropdownLabel");
    const tagSearch = $("tagSearchInput");
    const tagOptions = $("tagOptions");
    const selectedTagsBox = $("selectedTags");

    function renderTagOptions() {
        const q = tagSearch.value.trim().toLowerCase();
        const list = SKILLHUB_TAGS.filter(tag =>
            tagLabel(tag).toLowerCase().includes(q) || tag.includes(q)
        );

        if (!list.length) {
            tagOptions.innerHTML = '<div class="tp-tag-empty">No tag found</div>';
            return;
        }

        tagOptions.innerHTML = list.map(tag => `
            <label class="tp-tag-option">
                <input type="checkbox" value="${tag}" ${selectedTags.has(tag) ? "checked" : ""}>
                <span>${tagLabel(tag)}</span>
            </label>
        `).join("");
    }

    function renderSelectedTags() {
        tagLabelEl.textContent = selectedTags.size ? `${selectedTags.size} tag(s) selected` : "Select tags";

        selectedTagsBox.innerHTML = [...selectedTags].map(tag => `
            <span class="tp-chip">
                ${tagLabel(tag)}
                <button type="button" data-remove="${tag}" aria-label="Remove">&times;</button>
            </span>
        `).join("");
    }

    tagToggle.addEventListener("click", () => {
        tagDropdown.classList.toggle("open");
        if (tagDropdown.classList.contains("open")) tagSearch.focus();
    });

    // Click outside -> close the panel.
    // The old listener (from a previous visit of this page) is removed first.
    if (window.__acOutsideClick) document.removeEventListener("click", window.__acOutsideClick);
    window.__acOutsideClick = e => {
        if (!tagDropdown.contains(e.target)) tagDropdown.classList.remove("open");
    };
    document.addEventListener("click", window.__acOutsideClick);

    tagSearch.addEventListener("input", renderTagOptions);

    tagOptions.addEventListener("change", e => {
        if (e.target.type !== "checkbox") return;
        if (e.target.checked) selectedTags.add(e.target.value);
        else selectedTags.delete(e.target.value);
        renderSelectedTags();
    });

    selectedTagsBox.addEventListener("click", e => {
        const tag = e.target.dataset.remove;
        if (!tag) return;
        selectedTags.delete(tag);
        renderSelectedTags();
        renderTagOptions();
    });

    // ---------------------------------------------------------
    // FILE HELPERS
    // ---------------------------------------------------------
    const ext = file => file.name.split(".").pop().toLowerCase();
    const nameOnly = file => file.name.replace(/\.[^/.]+$/, "");

    // ---------------------------------------------------------
    // PROGRESS POPUP (styles are in teacher_pages.css)
    // ---------------------------------------------------------
    const progressEl = document.createElement("div");
    progressEl.className = "tp-progress-overlay";
    progressEl.innerHTML = `
        <div class="tp-progress-box">
            <div class="tp-spinner"></div>
            <h3 id="acProgressTitle">Creating Course...</h3>
            <p id="acProgressStep">Please wait...</p>
            <div class="tp-progress-track"><div id="acProgressFill" class="tp-progress-fill"></div></div>
            <div id="acProgressPercent" class="tp-progress-percent">0%</div>
        </div>`;
    root.appendChild(progressEl);

    function updateProgress(percent, title, step) {
        progressEl.style.display = "flex";
        const p = Math.max(0, Math.min(100, Math.round(percent)));
        $("acProgressFill").style.width = `${p}%`;
        $("acProgressPercent").textContent = `${p}%`;
        $("acProgressTitle").textContent = title;
        $("acProgressStep").textContent = step;
    }

    function hideProgress() {
        progressEl.style.display = "none";
    }

    // ---------------------------------------------------------
    // API ERROR -> readable text (handles FastAPI 422 format)
    // ---------------------------------------------------------
    function getApiErrorMessage(data, fallback) {
        if (!data) return fallback;
        if (typeof data.detail === "string") return data.detail;
        if (Array.isArray(data.detail)) {
            return data.detail.map(i => {
                if (typeof i === "string") return i;
                const field = Array.isArray(i.loc) ? i.loc.filter(x => x !== "body").join(".") : "";
                return (field ? field + ": " : "") + (i.msg || i.message || JSON.stringify(i));
            }).join(", ");
        }
        if (data.detail && typeof data.detail === "object") return JSON.stringify(data.detail);
        if (typeof data.message === "string") return data.message;
        return fallback;
    }

    async function readJson(res) {
        try { return await res.json(); } catch { return {}; }
    }

    // ---------------------------------------------------------
    // UPLOAD A FILE TO S3 (PUT to the presigned url) with progress
    // ---------------------------------------------------------
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
                    if (onProgress) onProgress(100);
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

    // ---------------------------------------------------------
    // MARK MEDIA AS READY
    // ---------------------------------------------------------
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

    // ---------------------------------------------------------
    // STEP 1 - CREATE COURSE
    // ---------------------------------------------------------
    async function createCourse() {
        const isPaid = courseTypeInput.value === "paid";

        const courseData = {
            course_name: courseNameInput.value.trim(),
            course_details: courseDetailsInput.value.trim(),
            course_language: languageInput.value,
            course_resource_type: resourceTypeInput.value,
            course_paid: isPaid,
            course_price: isPaid ? Number(priceInput.value) : 0,
            course_price_currency: "INR",
            course_tags: [...selectedTags]
            // total_enrollment, total_comment, total_rating, avg_rating are NOT sent:
            // the server manages those counters itself.
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

    // ---------------------------------------------------------
    // STEP 2 - UPLOAD THUMBNAIL (progress 20% -> 50%)
    // ---------------------------------------------------------
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

    // ---------------------------------------------------------
    // STEP 3 - UPLOAD VIDEO / PDF (progress 55% -> 90%)
    // ---------------------------------------------------------
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

    // ---------------------------------------------------------
    // FORM VALIDATION (throws an Error with a friendly message)
    // ---------------------------------------------------------
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

        if (!thumbnailInput.files.length) throw new Error("Please upload a course thumbnail.");
        const thumb = thumbnailInput.files[0];
        if (!["image/jpeg", "image/png"].includes(thumb.type)) {
            throw new Error("Thumbnail must be JPG, JPEG or PNG.");
        }

        if (!fileInput.files.length) throw new Error("Please upload a course video or PDF.");
        const resource = fileInput.files[0];
        if (resourceTypeInput.value === "video" && resource.type !== "video/mp4") {
            throw new Error("Resource Type is Video, so please upload an MP4 video.");
        }
        if (resourceTypeInput.value === "document" && resource.type !== "application/pdf") {
            throw new Error("Resource Type is Document, so please upload a PDF file.");
        }
    }

    // ---------------------------------------------------------
    // SUBMIT HANDLER
    // ---------------------------------------------------------
    addCourseForm.addEventListener("submit", async e => {
        e.preventDefault();

        submitBtn.disabled = true;
        submitBtn.textContent = "Creating Course...";

        try {
            updateProgress(5, "Checking Course Information...", "Validating your course details");
            validateForm();

            updateProgress(10, "Creating Course...", "Sending course information to server");
            const course = await createCourse();
            if (!course || !course.id) throw new Error("Course created but course ID was not returned.");

            updateProgress(20, "Course Created", "Preparing thumbnail upload...");
            await uploadThumbnail(course.id, thumbnailInput.files[0]);

            updateProgress(55, "Uploading Course Resource...", "Preparing video/PDF upload...");
            await uploadResource(course.id, fileInput.files[0]);

            updateProgress(95, "Finalizing Course...", "Almost finished...");
            await new Promise(r => setTimeout(r, 500));
            updateProgress(100, "Course Created Successfully!", "Your course is ready.");
            await new Promise(r => setTimeout(r, 900));

            hideProgress();
            alert("Course created successfully!");
            goToCourses();

        } catch (err) {
            console.error("Create Course Error:", err);
            hideProgress();
            alert(err.message || "Something went wrong.");
            submitBtn.disabled = false;
            submitBtn.textContent = "Submit";
        }
    });

    // ---------------------------------------------------------
    // INIT
    // ---------------------------------------------------------
    renderTagOptions();
    renderSelectedTags();
    togglePriceField();
})();