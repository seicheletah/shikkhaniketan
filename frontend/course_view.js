/* ==========================================================
   course_view.js
   The page a student sees AFTER purchasing a course.

   WHAT THE PLAYER SHOWS (new rule)
   - The course resource is a VIDEO    -> ONLY the video player is shown.
   - The course resource is a DOCUMENT -> ONLY the document (PDF) reader is shown.
   - The other one is never shown.
   - The "Course resources" file list (file names + download icons)
     and the Video / Documents toggle were removed.

   The page also has: a form to write a review (comment + 5 clickable
   stars), the list of reviews, and Edit / Delete for the student's own review.

   API used (exactly as in the backend docs):
     GET    /courses/{id}                      -> course data (title, description, course_resource_type)
     GET    /courses/{id}/media/resource/access -> the video / document link
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

    // The two players (only ONE of them is ever shown)
    const videoBox = document.getElementById("videoPlayerBox");
    const pdfBox = document.getElementById("pdfReaderBox");
    const video = document.querySelector("#videoPlayerBox video");
    const pdf = document.querySelector("#pdfReaderBox iframe");

    // The text line above the players ("Loading..." or an error)
    const mediaMsg = document.getElementById("cvMediaMsg");

    const titleEl = document.getElementById("cvTitle");
    const overviewEl = document.getElementById("cvOverview");
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

    // "Your review" card elements
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
       MESSAGE ABOVE THE PLAYERS
       ====================================================== */

    /** Shows a text line (loading / error) and hides both players. */
    function showMediaMessage(text) {
        mediaMsg.textContent = text;
        mediaMsg.classList.remove("hidden");
        videoBox.classList.add("hidden");
        pdfBox.classList.add("hidden");
    }

    if (!courseId) {
        titleEl.textContent = "Course not found!";
        overviewEl.textContent = "";
        showMediaMessage("Course not found.");
        return;
    }


    /* ======================================================
       HELPERS
       ====================================================== */

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

    /**
     * What kind of course is this? Read from the course data
     * (the same field courses.js uses: course_resource_type).
     * Returns "video", "pdf", or "" when the course does not say.
     */
    function getCourseType(course) {
        const raw = String((course && course.course_resource_type) || "").toLowerCase();

        if (raw.includes("doc") || raw.includes("pdf")) return "pdf";
        if (raw.includes("video")) return "video";
        return "";
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
       Returns the course object (or null when it failed), because
       the player needs "course_resource_type" from it.
       ====================================================== */
    async function loadCourse() {
        try {
            const res = await fetch(`${API}/courses/${courseId}`, {
                headers: authHeaders
            });

            if (!res.ok) {
                titleEl.textContent = "Course load failed";
                overviewEl.textContent = "";
                return null;
            }

            const course = await res.json();

            titleEl.textContent = course.course_name || "";
            overviewEl.textContent = course.course_details || "";

            return course;

        } catch (err) {
            console.log("loadCourse error:", err);
            titleEl.textContent = "Course load failed";
            overviewEl.textContent = "";
            return null;
        }
    }


    /* ======================================================
       LOAD THE VIDEO / DOCUMENT FILES
       GET /courses/{id}/media/resource/access
       Returns the list of files, or null when something went wrong
       (the reason is already shown on the page in that case).
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
                showMediaMessage(
                    `Could not load the course content (status ${res.status}). ${errBody.slice(0, 150)}`
                );
                return null;
            }

            const data = await res.json();
            const media = normalizeList(data);

            if (!media) {
                showMediaMessage("Unexpected response format. Check the browser console.");
                return null;
            }

            // Keep only the items that really have a file link
            const files = media.filter(item => getItemUrl(item));

            if (!files.length && media.length) {
                console.log("Items have no usable url field:", media);
                showMediaMessage("Content found but no file link in the response. Check the browser console.");
                return null;
            }

            return files;

        } catch (err) {
            console.log("loadMedia error:", err);
            showMediaMessage("Could not load the course content: " + err.message);
            return null;
        }
    }


    /* ======================================================
       SHOW ONLY THE RIGHT PLAYER
       Rule:
         1. The course says "video"    -> show the video player only.
         2. The course says "document" -> show the PDF reader only.
         3. If the course does not say (or the file of that kind is
            missing), look at the real files: a video wins, then a PDF.
       ====================================================== */
    function showResource(course, files) {

        const videos = files.filter(item => detectType(item) === "video");
        const pdfs = files.filter(item => detectType(item) === "pdf");

        // Step 1: what does the course say?
        let type = getCourseType(course);

        // Step 2: the course says "video" but there is no video file (or the same for pdf)
        if (type === "video" && !videos.length) type = "";
        if (type === "pdf" && !pdfs.length) type = "";

        // Step 3: decide from the real files
        if (!type) {
            if (videos.length) type = "video";
            else if (pdfs.length) type = "pdf";
        }

        // Nothing we can show
        if (!type) {
            showMediaMessage("No course content has been uploaded yet.");
            return;
        }

        // Hide the "Loading..." line
        mediaMsg.classList.add("hidden");

        if (type === "video") {
            // ---- VIDEO COURSE: show the video player, the PDF reader stays hidden ----
            video.src = absoluteUrl(getItemUrl(videos[0]));
            video.load();

            videoBox.classList.remove("hidden");
            pdfBox.classList.add("hidden");
            pdf.removeAttribute("src");   // make sure the hidden reader loads nothing
            return;
        }

        // ---- DOCUMENT COURSE: show the PDF reader, the video player stays hidden ----
        // #view=FitH makes the PDF fit the width of the viewer
        pdf.src = absoluteUrl(getItemUrl(pdfs[0])) + "#view=FitH";

        pdfBox.classList.remove("hidden");
        videoBox.classList.add("hidden");
        video.removeAttribute("src");   // make sure the hidden player loads nothing
        video.load();
    }

    /**
     * Loads the course data and the files AT THE SAME TIME (faster),
     * then decides which player to show.
     */
    async function loadContent() {
        showMediaMessage("Loading course content...");

        const [course, files] = await Promise.all([loadCourse(), loadMedia()]);

        // loadMedia() already showed the reason on the page
        if (files === null) return;

        showResource(course || {}, files);
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
       All requests start at the SAME TIME.
       For the reviews we first find out which review is the student's
       own, then draw the list and the correct card.
       ====================================================== */
    async function loadReviewSection() {
        // The own name and the own-review endpoint are independent: run together
        await Promise.all([loadMyName(), loadMyReviewFromApi()]);

        await loadReviews();      // may also find the own review by name
        updateReviewUI();         // show "Your review" card or the form
    }

    loadContent();          // course title + the video OR the document
    loadRating();
    loadReviewSection();

})();