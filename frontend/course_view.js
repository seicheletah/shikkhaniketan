/* ==========================================================
   course_view.js
   The page a student sees AFTER purchasing a course:
   video player, PDF reader, resource list, a form to write a
   review (comment + 5 clickable stars) and the list of reviews.

   NEW in this version: the student can UPDATE and DELETE
   his / her own review.

   API used (exactly as in the backend docs):
     POST   /courses/{id}/review               body: { comment, rate }   -> 201
     GET    /courses/{id}/review               -> [{ comment, rate, first_name, last_name, course_id }]
     GET    /courses/{id}/rating               -> { total_reviews, average_rating, course_id }
     PATCH  /students/me/courses/{id}/review   body: { comment, rate }   -> 200 { comment, rate, course_id }
     DELETE /students/me/courses/{id}/review                             -> 204 (no body)
     GET    /students/me                       -> own first_name / last_name (used to spot own review)
     GET    /students/me/courses/{id}/review   -> OPTIONAL. Used only if your backend has it
                                                  (see "FIND THE STUDENT'S OWN REVIEW" below).
   ========================================================== */
(() => {

    const API = "http://127.0.0.1:8000/api/v1";
    const API_ORIGIN = new URL(API).origin;

    const token = localStorage.getItem("access_token");
    const role = localStorage.getItem("userRole");

    // Only a logged-in student may open this page
    if (!token || role !== "student") {
        window.location.href = "sign_up.html";
        return;
    }

    // The URL parameter wins; inside the dashboard the URL has no id,
    // so we fall back to the id saved in localStorage by courses.js.
    const params = new URLSearchParams(window.location.search);
    const courseId =
        params.get("course") ||
        params.get("id") ||
        localStorage.getItem("selected_course_id");

    /* ------------------------------------------------------
       DOM ELEMENTS
       ------------------------------------------------------ */
    const video = document.querySelector("#videoPlayerBox video");
    const pdf = document.querySelector("#pdfReaderBox iframe");

    const titleEl = document.getElementById("cvTitle");
    const overviewEl = document.getElementById("cvOverview");
    const resourceList = document.getElementById("cvResourceList");
    const fileCountEl = document.getElementById("cvFileCount");
    const reviewList = document.getElementById("cvReviewList");
    const avgRatingEl = document.getElementById("cvAvgRating");

    // "Write / edit a review" form elements
    const reviewFormCard = document.getElementById("reviewFormCard");
    const formTitle = document.getElementById("cvFormTitle");
    const starButtons = document.querySelectorAll("#cvStarPicker .cv-star-btn");
    const starText = document.getElementById("cvStarText");
    const commentInput = document.getElementById("cvComment");
    const formMsg = document.getElementById("cvFormMsg");
    const submitBtn = document.getElementById("cvSubmitReview");
    const cancelBtn = document.getElementById("cvCancelEdit");

    // NEW: "Your review" card elements
    const myReviewCard = document.getElementById("myReviewCard");
    const myStarsEl = document.getElementById("cvMyStars");
    const myCommentEl = document.getElementById("cvMyComment");
    const myMsg = document.getElementById("cvMyMsg");
    const editBtn = document.getElementById("cvEditReview");
    const deleteBtn = document.getElementById("cvDeleteReview");

    // Headers for requests that need the token
    const authHeaders = {
        Authorization: `Bearer ${token}`,
        Accept: "application/json"
    };


    /* ======================================================
       STATE (what this page currently knows)
       ====================================================== */

    // The student's own review: { comment, rate } or null when there is none.
    let myReview = null;

    // The student's own name, used to recognise the own review in the list.
    let myName = "";

    // true while the student is editing the review (form shows PATCH mode)
    let isEditing = false;


    /* ======================================================
       SCROLL TO TOP
       Inside the dashboard the scrolling happens in #main-content,
       NOT in the browser window, so window.scrollTo alone does nothing.
       ====================================================== */
    function scrollToTop() {
        const scroller = document.getElementById("main-content");
        if (scroller && scroller.scrollHeight > scroller.clientHeight) {
            scroller.scrollTo({ top: 0, behavior: "smooth" });
        } else {
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
    }


    /* ======================================================
       BACK BUTTON
       ====================================================== */
    document.getElementById("cvBackBtn").addEventListener("click", () => {
        if (typeof window.loadDashboardPage === "function") {
            window.loadDashboardPage("course_details.html");
        } else {
            window.location.href = "student.html";
        }
    });


    /* ======================================================
       VIDEO / DOCUMENTS TOGGLE
       ====================================================== */
    const mediaButtons = document.querySelectorAll(".toggle-btn");

    function showMedia(type) {
        mediaButtons.forEach(b => {
            b.classList.toggle("active", b.getAttribute("data-media") === type);
        });

        document.getElementById("videoPlayerBox")
            .classList.toggle("hidden", type !== "video");
        document.getElementById("pdfReaderBox")
            .classList.toggle("hidden", type !== "pdf");
    }

    mediaButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            showMedia(btn.getAttribute("data-media"));
        });
    });

    if (!courseId) {
        titleEl.textContent = "Course not found!";
        overviewEl.textContent = "";
        if (resourceList) resourceList.innerHTML = "<li class='cv-empty'>Course not found.</li>";
        return;
    }


    /* ======================================================
       HELPERS
       ====================================================== */

    function setResourceMessage(text) {
        if (!resourceList) return;
        resourceList.innerHTML = "";
        const li = document.createElement("li");
        li.className = "cv-empty";
        li.textContent = text;
        resourceList.appendChild(li);
    }

    /** Finds the file link in an item (the backend field name can vary). */
    function getItemUrl(item) {
        if (!item || typeof item !== "object") return "";
        return (
            item.access_url ||
            item.stream_url ||
            item.url ||
            item.file_url ||
            item.signed_url ||
            item.download_url ||
            item.media_url ||
            ""
        );
    }

    /** Accepts an array OR an object and returns the list of items. */
    function normalizeList(data) {
        if (Array.isArray(data)) return data;

        if (data && typeof data === "object") {
            const keys = [
                "resources", "media", "items", "data",
                "results", "files", "videos", "documents"
            ];
            for (const key of keys) {
                if (Array.isArray(data[key])) return data[key];
            }

            // A single item
            if (getItemUrl(data)) return [data];

            // Fallback: first array in the object
            for (const value of Object.values(data)) {
                if (Array.isArray(value)) return value;
            }
        }

        return null;
    }

    function absoluteUrl(url) {
        try {
            return new URL(url, API_ORIGIN).href;
        } catch (e) {
            return url;
        }
    }

    /** Decides whether an item is a "video", a "pdf" or "other". */
    function detectType(item) {
        const mt = String(
            item.media_type || item.resource_type || item.type ||
            item.content_type || item.mime_type || item.file_type || ""
        ).toLowerCase();

        const url = String(getItemUrl(item)).toLowerCase().split("?")[0];
        const name = String(
            item.file_name || item.filename || item.original_name || ""
        ).toLowerCase();

        if (mt.includes("video") || /\.(mp4|webm|ogg|mov|mkv)$/.test(url) || /\.(mp4|webm|ogg|mov|mkv)$/.test(name)) {
            return "video";
        }
        if (mt.includes("pdf") || mt.includes("document") || /\.pdf$/.test(url) || /\.pdf$/.test(name)) {
            return "pdf";
        }
        return "other";
    }

    function getResourceName(item, index) {
        const direct =
            item.file_name || item.filename || item.original_name ||
            item.original_filename || item.title || item.name;

        if (direct) return direct;

        // Try to read the file name from the link
        try {
            const path = new URL(getItemUrl(item), window.location.href).pathname;
            const last = decodeURIComponent(path.split("/").filter(Boolean).pop() || "");
            if (last && last.includes(".")) return last;
        } catch (e) { /* ignore */ }

        return detectType(item) === "video"
            ? `Video ${index + 1}`
            : `Document ${index + 1}`;
    }

    /** "Soumya De" -> "SD" (letters shown inside the round avatar). */
    function getInitials(name) {
        const parts = String(name || "Student").trim().split(/\s+/).filter(Boolean);
        if (!parts.length) return "S";
        const first = parts[0][0] || "";
        const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
        return (first + last).toUpperCase();
    }

    /** Builds "First Last" from the review API fields. */
    function getFullName(review) {
        const full = `${review.first_name || ""} ${review.last_name || ""}`.trim();
        return full || "Student";
    }

    /** Fills `container` with 5 stars; the first `rating` stars are gold. */
    function renderStars(container, rating) {
        container.innerHTML = "";
        const rounded = Math.round(Number(rating) || 0);

        for (let i = 1; i <= 5; i++) {
            const star = document.createElement("span");
            star.textContent = "★";
            star.className = i <= rounded ? "cv-star-full" : "cv-star-empty";
            container.appendChild(star);
        }
    }

    /**
     * Reads a readable error message out of a failed API response body.
     * FastAPI sends either { detail: "text" } or, for 422 errors,
     * { detail: [ { msg: "text", ... } ] }.
     */
    function getErrorMessage(data, fallback) {
        if (data && typeof data.detail === "string") {
            return data.detail;
        }
        if (data && Array.isArray(data.detail) && data.detail[0] && data.detail[0].msg) {
            return data.detail[0].msg;
        }
        return fallback;
    }

    /** Token expired or invalid -> send the student to the login page. */
    function goToLogin() {
        window.location.href = "login.html";
    }


    /* ======================================================
       LOAD COURSE (title + description)
       ====================================================== */
    async function loadCourse() {
        try {
            const res = await fetch(`${API}/courses/${courseId}`, {
                headers: authHeaders
            });

            if (!res.ok) {
                titleEl.textContent = "Course load failed";
                overviewEl.textContent = "";
                setResourceMessage(`Course load failed (status ${res.status}).`);
                return;
            }

            const course = await res.json();

            titleEl.textContent = course.course_name || "";
            overviewEl.textContent = course.course_details || "";

        } catch (err) {
            console.log("loadCourse error:", err);
            titleEl.textContent = "Course load failed";
            overviewEl.textContent = "";
            setResourceMessage("Could not reach the server.");
        }
    }


    /* ======================================================
       PLAY A RESOURCE IN THE PLAYER
       ====================================================== */
    function playResource(item) {
        const type = detectType(item);
        const url = absoluteUrl(getItemUrl(item));

        if (type === "video") {
            video.src = url;
            video.load();
            showMedia("video");
            video.play().catch(() => { /* autoplay blocked, ignore */ });
            scrollToTop();
            return;
        }

        if (type === "pdf") {
            // #view=FitH makes the PDF fit the width of the viewer
            pdf.src = url + "#view=FitH";
            showMedia("pdf");
            scrollToTop();
            return;
        }

        window.open(url, "_blank", "noopener");
    }


    /* ======================================================
       RESOURCE LIST
       ====================================================== */
    function renderResources(files) {
        if (!resourceList) return;

        resourceList.innerHTML = "";
        fileCountEl.textContent = `${files.length} ${files.length === 1 ? "file" : "files"}`;

        if (!files.length) {
            setResourceMessage("No resources uploaded yet.");
            return;
        }

        files.forEach((item, index) => {
            const type = detectType(item);
            const url = absoluteUrl(getItemUrl(item));

            const li = document.createElement("li");
            li.className = "cv-res-item";

            // Icon
            const icon = document.createElement("div");
            icon.className = "cv-res-icon " + (type === "video" ? "video" : "doc");
            icon.innerHTML = type === "video"
                ? '<i class="fa-regular fa-circle-play"></i>'
                : '<i class="fa-regular fa-file-lines"></i>';

            // Name + type label
            const info = document.createElement("div");
            info.className = "cv-res-info";

            const name = document.createElement("span");
            name.className = "cv-res-name";
            name.textContent = getResourceName(item, index);

            const typeLabel = document.createElement("span");
            typeLabel.className = "cv-res-type";
            typeLabel.textContent = type === "video" ? "Video" : "Document";

            info.append(name, typeLabel);

            // Right action: open (video) or download (document)
            const action = document.createElement("a");
            action.className = "cv-res-action";
            action.href = url;
            action.target = "_blank";
            action.rel = "noopener";
            action.title = type === "video" ? "Open in new tab" : "Download";
            action.innerHTML = type === "video"
                ? '<i class="fa-solid fa-arrow-up-right-from-square"></i>'
                : '<i class="fa-solid fa-download"></i>';

            if (type !== "video") {
                action.setAttribute("download", "");
            }

            // Clicking the icon opens the link directly, not the player
            action.addEventListener("click", e => e.stopPropagation());

            li.append(icon, info, action);

            // Clicking anywhere else plays it in the player
            li.addEventListener("click", () => playResource(item));

            resourceList.appendChild(li);
        });
    }


    /* ======================================================
       LOAD VIDEO / PDF RESOURCES
       ====================================================== */
    async function loadMedia() {
        try {
            const res = await fetch(
                `${API}/courses/${courseId}/media/resource/access`,
                { headers: authHeaders }
            );

            if (!res.ok) {
                const errBody = await res.text().catch(() => "");
                console.log("media error:", res.status, errBody);
                setResourceMessage(
                    `Could not load resources (status ${res.status}). ${errBody.slice(0, 150)}`
                );
                return;
            }

            const data = await res.json();
            const media = normalizeList(data);

            if (!media) {
                setResourceMessage("Unexpected response format. Check the browser console.");
                return;
            }

            const files = media.filter(item => getItemUrl(item));

            if (!files.length && media.length) {
                console.log("Items have no usable url field:", media);
                setResourceMessage("Resources found but no file link in response. Check the browser console.");
                return;
            }

            renderResources(files);

            // Preload the first video and first PDF into the players
            const firstVideo = files.find(item => detectType(item) === "video");
            const firstPdf = files.find(item => detectType(item) === "pdf");

            if (firstVideo) {
                video.src = absoluteUrl(getItemUrl(firstVideo));
                video.load();
            }

            if (firstPdf) {
                pdf.src = absoluteUrl(getItemUrl(firstPdf)) + "#view=FitH";
            }

            // No video but a PDF exists -> open the Documents tab
            if (!firstVideo && firstPdf) {
                showMedia("pdf");
            }

        } catch (err) {
            console.log("loadMedia error:", err);
            setResourceMessage("Could not load resources: " + err.message);
        }
    }


    /* ======================================================
       RATING SUMMARY
       GET /courses/{id}/rating -> { total_reviews, average_rating, course_id }
       Shown in the header of the "Student reviews" card.
       ====================================================== */
    async function loadRating() {
        try {
            const res = await fetch(`${API}/courses/${courseId}/rating`, {
                headers: authHeaders
            });

            if (!res.ok) return;

            const data = await res.json();

            const total = Number(data.total_reviews) || 0;
            const average = Number(data.average_rating) || 0;

            avgRatingEl.textContent = total
                ? `${average.toFixed(1)} average · ${total} ${total === 1 ? "review" : "reviews"}`
                : "";

        } catch (err) {
            console.log("Rating load error:", err);
        }
    }


    /* ======================================================
       FIND THE STUDENT'S OWN REVIEW
       The public list (GET /courses/{id}/review) has NO user id,
       only first_name + last_name. So we find the own review in
       two steps:

       Step 1 (best): ask GET /students/me/courses/{id}/review.
         If your backend has this "Get Self Review" endpoint, it
         returns exactly the student's own review. If it does not
         exist (404 / 405) we silently go to step 2.

       Step 2 (fallback): compare the names in the review list with
         the student's own name from GET /students/me.
         This is only used when exactly ONE review has that name.
       ====================================================== */

    /** Loads the student's own name (used by step 2 and for the "You" badge). */
    async function loadMyName() {
        try {
            const res = await fetch(`${API}/students/me`, { headers: authHeaders });
            if (!res.ok) return;

            const data = await res.json();
            myName = `${data.first_name || ""} ${data.last_name || ""}`.trim();
        } catch (err) {
            console.log("Could not load own name:", err);
        }
    }

    /** Step 1: try the dedicated "own review" endpoint (may not exist). */
    async function loadMyReviewFromApi() {
        try {
            const res = await fetch(`${API}/students/me/courses/${courseId}/review`, {
                headers: authHeaders
            });

            if (!res.ok) return; // 404 / 405 -> endpoint missing or no review yet

            const data = await res.json();

            if (data && data.rate !== undefined) {
                myReview = { comment: data.comment || "", rate: Number(data.rate) };
            }
        } catch (err) {
            console.log("Own review endpoint not available:", err);
        }
    }

    /** True when review `r` from the list belongs to the logged-in student. */
    function isMyReview(r) {
        if (!myReview) return false;

        return (
            (r.comment || "") === myReview.comment &&
            Number(r.rate) === Number(myReview.rate) &&
            (!myName || getFullName(r) === myName)
        );
    }


    /* ======================================================
       REVIEW LIST
       GET /courses/{id}/review
       -> [{ comment, rate, first_name, last_name, course_id }]
       ====================================================== */
    async function loadReviews() {
        try {
            const res = await fetch(`${API}/courses/${courseId}/review`, {
                headers: authHeaders
            });

            if (!res.ok) {
                reviewList.innerHTML = "<p class='cv-empty'>Could not load reviews.</p>";
                return;
            }

            const reviews = await res.json();

            // Step 2 of "find own review": match by name when step 1 found nothing
            if (!myReview && myName && Array.isArray(reviews)) {
                const sameName = reviews.filter(r => getFullName(r) === myName);

                // Only trust the match when it is unambiguous (exactly one review)
                if (sameName.length === 1) {
                    myReview = {
                        comment: sameName[0].comment || "",
                        rate: Number(sameName[0].rate)
                    };
                }
            }

            reviewList.innerHTML = "";

            if (!Array.isArray(reviews) || !reviews.length) {
                const p = document.createElement("p");
                p.className = "cv-empty";
                p.textContent = "No reviews yet.";
                reviewList.appendChild(p);
                return;
            }

            reviews.forEach(r => {
                const fullName = getFullName(r);

                const item = document.createElement("div");
                item.className = "review-item";

                // Round avatar with initials
                const avatar = document.createElement("div");
                avatar.className = "cv-avatar";
                avatar.textContent = getInitials(fullName);

                const body = document.createElement("div");
                body.className = "review-body";

                // Name on the left, stars on the right
                const header = document.createElement("div");
                header.className = "reviewer-header";

                const name = document.createElement("strong");
                name.textContent = fullName;

                // Small "You" badge on the student's own review
                if (isMyReview(r)) {
                    const badge = document.createElement("span");
                    badge.className = "cv-you-badge";
                    badge.textContent = "You";
                    name.appendChild(badge);
                }

                const stars = document.createElement("span");
                stars.className = "cv-stars";
                renderStars(stars, r.rate);

                header.append(name, stars);

                // textContent keeps comments safe from HTML injection
                const text = document.createElement("p");
                text.textContent = r.comment || "";

                body.append(header, text);
                item.append(avatar, body);
                reviewList.appendChild(item);
            });

        } catch (err) {
            console.log(err);
            reviewList.innerHTML = "<p class='cv-empty'>Could not load reviews.</p>";
        }
    }


    /* ======================================================
       STAR PICKER (used by both "write" and "edit")
       ====================================================== */
    let selectedRate = 0; // 0 means "nothing selected yet"

    // Text shown next to the stars for each rating
    const RATE_LABELS = ["Select a rating", "Poor", "Fair", "Good", "Very good", "Excellent"];

    /** Colours the first `count` stars gold and the rest grey. */
    function paintStars(count) {
        starButtons.forEach(btn => {
            const value = Number(btn.getAttribute("data-value"));
            btn.classList.toggle("filled", value <= count);
        });
    }

    /** Selects a rating: paints the stars and updates the text next to them. */
    function setRating(value) {
        selectedRate = value;
        paintStars(selectedRate);
        starText.textContent = selectedRate
            ? `${selectedRate} / 5 - ${RATE_LABELS[selectedRate]}`
            : RATE_LABELS[0];
    }

    starButtons.forEach(btn => {
        const value = Number(btn.getAttribute("data-value"));

        // Hover preview: temporarily show how many stars would be selected
        btn.addEventListener("mouseenter", () => paintStars(value));

        // Click: lock in the rating
        btn.addEventListener("click", () => setRating(value));
    });

    // When the mouse leaves the stars, go back to the chosen rating
    document.getElementById("cvStarPicker").addEventListener("mouseleave", () => {
        paintStars(selectedRate);
    });

    /** Shows a success (green) or error (red) message under the form. */
    function showFormMessage(text, type) {
        formMsg.textContent = text;
        formMsg.className = `cv-form-msg ${type}`;
    }

    /** Shows a success / error message inside the "Your review" card. */
    function showMyMessage(text, type) {
        myMsg.textContent = text;
        myMsg.className = `cv-my-msg ${type}`;
    }

    /** Clears the form (rating + comment + message). */
    function resetForm() {
        setRating(0);
        commentInput.value = "";
        formMsg.className = "cv-form-msg hidden";
    }


    /* ======================================================
       SHOW THE RIGHT CARD
       - Student has a review and is NOT editing -> show "Your review" card
       - Otherwise -> show the form ("Write a review" or "Edit your review")
       ====================================================== */
    function updateReviewUI() {

        if (myReview && !isEditing) {
            // ---- Show the saved review ----
            renderStars(myStarsEl, myReview.rate);
            myCommentEl.textContent = myReview.comment;

            myReviewCard.classList.remove("hidden");
            reviewFormCard.classList.add("hidden");
            return;
        }

        // ---- Show the form ----
        myReviewCard.classList.add("hidden");
        reviewFormCard.classList.remove("hidden");

        if (isEditing) {
            formTitle.textContent = "Edit your review";
            submitBtn.textContent = "Update review";
            cancelBtn.classList.remove("hidden");
        } else {
            formTitle.textContent = "Write a review";
            submitBtn.textContent = "Submit review";
            cancelBtn.classList.add("hidden");
        }
    }


    /* ======================================================
       EDIT BUTTON  -> put the saved values into the form
       ====================================================== */
    editBtn.addEventListener("click", () => {
        if (!myReview) return;

        isEditing = true;

        // Pre-fill the form with the current rating and comment
        setRating(myReview.rate);
        commentInput.value = myReview.comment;
        formMsg.className = "cv-form-msg hidden";
        myMsg.className = "cv-my-msg hidden";

        updateReviewUI();
        reviewFormCard.scrollIntoView({ behavior: "smooth", block: "center" });
    });

    /* ======================================================
       CANCEL BUTTON  -> leave edit mode without saving
       ====================================================== */
    cancelBtn.addEventListener("click", () => {
        isEditing = false;
        resetForm();
        updateReviewUI();
    });


    /* ======================================================
       SUBMIT BUTTON
       - not editing -> POST  /courses/{id}/review                (new review)
       - editing     -> PATCH /students/me/courses/{id}/review    (update)
       ====================================================== */
    submitBtn.addEventListener("click", async () => {

        const comment = commentInput.value.trim();

        // ---- Validation before calling the API ----
        if (selectedRate < 1) {
            showFormMessage("Please select a star rating first.", "error");
            return;
        }

        if (!comment) {
            showFormMessage("Please write a comment.", "error");
            return;
        }

        // Remember which action this is (the button text changes below)
        const wasEditing = isEditing;

        // Disable the buttons so the user cannot click twice
        submitBtn.disabled = true;
        cancelBtn.disabled = true;
        submitBtn.textContent = wasEditing ? "Updating..." : "Submitting...";
        formMsg.className = "cv-form-msg hidden";

        try {
            // Same body for both: field names must match the backend exactly
            const url = wasEditing
                ? `${API}/students/me/courses/${courseId}/review`
                : `${API}/courses/${courseId}/review`;

            const res = await fetch(url, {
                method: wasEditing ? "PATCH" : "POST",
                headers: {
                    ...authHeaders,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    comment: comment,
                    rate: selectedRate
                })
            });

            const data = await res.json().catch(() => ({}));

            // Token expired -> go to login
            if (res.status === 401) {
                goToLogin();
                return;
            }

            if (!res.ok) {
                // Show the backend message when it sends one
                showFormMessage(
                    getErrorMessage(data, "Could not save your review. Please try again."),
                    "error"
                );
                return;
            }

            // ---- Success (201 for POST, 200 for PATCH) ----
            // Remember the saved values so the "Your review" card can show them
            myReview = { comment: comment, rate: selectedRate };
            isEditing = false;
            resetForm();
            updateReviewUI();

            showMyMessage(
                wasEditing
                    ? "Your review has been updated."
                    : "Thank you! Your review has been submitted.",
                "success"
            );

            // Refresh the list and the average so the change appears at once
            loadReviews();
            loadRating();

        } catch (err) {
            console.log("Save review error:", err);
            showFormMessage("Network error. Please check your connection.", "error");
        } finally {
            // Always re-enable the buttons and restore the correct texts
            submitBtn.disabled = false;
            cancelBtn.disabled = false;
            updateReviewUI();
        }
    });


    /* ======================================================
       DELETE BUTTON
       DELETE /students/me/courses/{id}/review  -> 204 (no body)
       ====================================================== */
    deleteBtn.addEventListener("click", async () => {

        // Ask first, a deleted review can not be brought back
        const sure = window.confirm("Do you really want to delete your review?");
        if (!sure) return;

        const originalHtml = deleteBtn.innerHTML;
        deleteBtn.disabled = true;
        editBtn.disabled = true;
        deleteBtn.innerHTML = "Deleting...";
        myMsg.className = "cv-my-msg hidden";

        try {
            const res = await fetch(`${API}/students/me/courses/${courseId}/review`, {
                method: "DELETE",
                headers: authHeaders
            });

            // Token expired -> go to login
            if (res.status === 401) {
                goToLogin();
                return;
            }

            if (!res.ok) {
                // A 204 has no body, but an error usually has one
                const data = await res.json().catch(() => ({}));
                showMyMessage(
                    getErrorMessage(data, "Could not delete your review. Please try again."),
                    "error"
                );
                return;
            }

            // ---- Success (204) ----
            myReview = null;
            isEditing = false;
            resetForm();
            updateReviewUI();   // the "Write a review" form comes back

            showFormMessage("Your review has been deleted.", "success");

            // Refresh the list and the average
            loadReviews();
            loadRating();

        } catch (err) {
            console.log("Delete review error:", err);
            showMyMessage("Network error. Please check your connection.", "error");
        } finally {
            deleteBtn.disabled = false;
            editBtn.disabled = false;
            deleteBtn.innerHTML = originalHtml;
        }
    });


    /* ======================================================
       START
       All requests start at the SAME TIME (before: the media, reviews
       and rating requests waited until the course had loaded).
       For the reviews we first find out which review is the student's
       own, then draw the list and the correct card.
       ====================================================== */
    async function loadReviewSection() {
        // The own name and the own-review endpoint are independent: run together
        await Promise.all([loadMyName(), loadMyReviewFromApi()]);

        await loadReviews();      // may also find the own review by name
        updateReviewUI();         // show "Your review" card or the form
    }

    loadCourse();
    loadMedia();
    loadRating();
    loadReviewSection();

})();