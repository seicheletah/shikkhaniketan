/* ==========================================================
   course_view.js
   The page a student sees AFTER purchasing a course:
   video player, PDF reader, resource list, a form to write a
   review (comment + 5 clickable stars) and the list of reviews.

   API fields used (exactly as in the backend docs):
     POST /courses/{id}/review  body: { comment, rate }
     GET  /courses/{id}/review  -> [{ comment, rate, first_name, last_name, course_id }]
     GET  /courses/{id}/rating  -> { total_reviews, average_rating, course_id }
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

    // Inside the dashboard the URL has no id, so read it from localStorage
    const params = new URLSearchParams(window.location.search);
    const courseId =
        localStorage.getItem("selected_course_id") ||
        params.get("course") ||
        params.get("id");

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

    // Review form elements
    const starButtons = document.querySelectorAll("#cvStarPicker .cv-star-btn");
    const starText = document.getElementById("cvStarText");
    const commentInput = document.getElementById("cvComment");
    const formMsg = document.getElementById("cvFormMsg");
    const submitBtn = document.getElementById("cvSubmitReview");

    // Headers for requests that need the token
    const authHeaders = {
        Authorization: `Bearer ${token}`,
        Accept: "application/json"
    };


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

            loadMedia();
            loadReviews();
            loadRating();

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
            window.scrollTo({ top: 0, behavior: "smooth" });
            return;
        }

        if (type === "pdf") {
            // #view=FitH makes the PDF fit the width of the viewer
            pdf.src = url + "#view=FitH";
            showMedia("pdf");
            window.scrollTo({ top: 0, behavior: "smooth" });
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
       WRITE A REVIEW: STAR PICKER
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

    starButtons.forEach(btn => {
        const value = Number(btn.getAttribute("data-value"));

        // Hover preview: temporarily show how many stars would be selected
        btn.addEventListener("mouseenter", () => paintStars(value));

        // Click: lock in the rating
        btn.addEventListener("click", () => {
            selectedRate = value;
            paintStars(selectedRate);
            starText.textContent = `${selectedRate} / 5 - ${RATE_LABELS[selectedRate]}`;
        });
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

    /** Clears the form after a successful submit. */
    function resetForm() {
        selectedRate = 0;
        paintStars(0);
        starText.textContent = RATE_LABELS[0];
        commentInput.value = "";
    }


    /* ======================================================
       WRITE A REVIEW: SUBMIT
       POST /courses/{id}/review  body: { comment, rate }
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

        // Disable the button so the user cannot click twice
        submitBtn.disabled = true;
        submitBtn.textContent = "Submitting...";
        formMsg.className = "cv-form-msg hidden";

        try {
            const res = await fetch(`${API}/courses/${courseId}/review`, {
                method: "POST",
                headers: {
                    ...authHeaders,
                    "Content-Type": "application/json"
                },
                // Field names must match the backend exactly: comment + rate
                body: JSON.stringify({
                    comment: comment,
                    rate: selectedRate
                })
            });

            const data = await res.json().catch(() => ({}));

            // Token expired -> go to login
            if (res.status === 401) {
                window.location.href = "login.html";
                return;
            }

            if (!res.ok) {
                // Show the backend message when it sends one (e.g. "already reviewed")
                let msg = "Could not submit your review. Please try again.";

                if (typeof data.detail === "string") {
                    msg = data.detail;
                } else if (Array.isArray(data.detail) && data.detail[0] && data.detail[0].msg) {
                    // 422 validation error format
                    msg = data.detail[0].msg;
                }

                showFormMessage(msg, "error");
                return;
            }

            // ---- Success (201) ----
            showFormMessage("Thank you! Your review has been submitted.", "success");
            resetForm();

            // Refresh the list and the average so the new review appears at once
            loadReviews();
            loadRating();

        } catch (err) {
            console.log("Submit review error:", err);
            showFormMessage("Network error. Please check your connection.", "error");
        } finally {
            // Always re-enable the button
            submitBtn.disabled = false;
            submitBtn.textContent = "Submit review";
        }
    });


    /* ======================================================
       START
       ====================================================== */
    loadCourse();

})();