/* ==========================================================
   course_view.js
   The page a student sees AFTER purchasing a course.
   ========================================================== */
(() => {
  const API = "api/v1";
  const API_ORIGIN = new URL(API, window.location.href).origin;

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
    params.get("course") || params.get("id") || localStorage.getItem("selected_course_id");

  /* ------------------------------------------------------
     DOM ELEMENTS
     ------------------------------------------------------ */
  const videoBox = document.getElementById("videoPlayerBox");
  const pdfBox = document.getElementById("pdfReaderBox");
  const video = document.querySelector("#videoPlayerBox video");
  const pdf = document.querySelector("#pdfReaderBox iframe");

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

  const authHeaders = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };

  /* ======================================================
     STATE
     ====================================================== */
  let myReview = null;
  let myName = "";
  let isEditing = false;

  /* ======================================================
     MESSAGE ABOVE THE PLAYERS
     ====================================================== */
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
  function getItemUrl(item) {
    if (!item || typeof item !== "object") return "";
    return (
      item.stream_url ||
      item.access_url ||
      item.url ||
      item.file_url ||
      item.signed_url ||
      item.download_url ||
      item.media_url ||
      ""
    );
  }

  function normalizeList(data) {
    if (Array.isArray(data)) return data;

    if (data && typeof data === "object") {
      const keys = [
        "resources",
        "media",
        "items",
        "data",
        "results",
        "files",
        "videos",
        "documents",
      ];
      for (const key of keys) {
        if (Array.isArray(data[key])) return data[key];
      }

      if (getItemUrl(data)) return [data];

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

  function detectType(item) {
    const mt = String(
      item.media_type ||
        item.resource_type ||
        item.type ||
        item.content_type ||
        item.mime_type ||
        item.file_type ||
        "",
    ).toLowerCase();

    const url = String(getItemUrl(item)).toLowerCase().split("?")[0];
    const name = String(item.file_name || item.filename || item.original_name || "").toLowerCase();

    if (
      mt.includes("video") ||
      /\.(mp4|webm|ogg|mov|mkv)$/.test(url) ||
      /\.(mp4|webm|ogg|mov|mkv)$/.test(name)
    ) {
      return "video";
    }
    if (
      mt.includes("pdf") ||
      mt.includes("document") ||
      /\.pdf$/.test(url) ||
      /\.pdf$/.test(name)
    ) {
      return "pdf";
    }
    return "other";
  }

  function getCourseType(course) {
    const raw = String((course && course.course_resource_type) || "").toLowerCase();

    if (raw.includes("doc") || raw.includes("pdf")) return "pdf";
    if (raw.includes("video")) return "video";
    return "";
  }

  function getInitials(name) {
    const parts = String(name || "Student")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (!parts.length) return "S";
    const first = parts[0][0] || "";
    const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
    return (first + last).toUpperCase();
  }

  function getFullName(review) {
    const full = `${review.first_name || ""} ${review.last_name || ""}`.trim();
    return full || "Student";
  }

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

  function updateRatingSummary(total, average) {
    const count = Number(total) || 0;
    const avg = Number(average) || 0;
    avgRatingEl.textContent = count
      ? `${avg.toFixed(1)} average · ${count} ${count === 1 ? "review" : "reviews"}`
      : "";
  }

  function getErrorMessage(data, fallback) {
    if (data && typeof data.detail === "string") {
      return data.detail;
    }
    if (data && Array.isArray(data.detail) && data.detail[0] && data.detail[0].msg) {
      return data.detail[0].msg;
    }
    return fallback;
  }

  function goToLogin() {
    window.location.href = "login.html";
  }

  /* ======================================================
     LOAD COURSE (title + description + initial rating summary)
     GET /api/v1/courses/{id}
     ====================================================== */
  async function loadCourse() {
    try {
      const res = await fetch(`${API}/courses/${courseId}`, {
        headers: authHeaders,
      });

      if (res.status === 401) {
        goToLogin();
        return null;
      }

      if (!res.ok) {
        titleEl.textContent = "Course load failed";
        overviewEl.textContent = "";
        return null;
      }

      const course = await res.json();

      titleEl.textContent = course.course_name || "Course";
      overviewEl.textContent = course.course_details || "";
      updateRatingSummary(course.total_rating, course.avg_rating);

      return course;
    } catch (err) {
      console.log("loadCourse error:", err);
      titleEl.textContent = "Course load failed";
      overviewEl.textContent = "";
      return null;
    }
  }

  /* ======================================================
     LOAD THE VIDEO / DOCUMENT STREAM URL
     GET /api/v1/courses/{id}/media/resource/access
     ====================================================== */
  async function loadMedia() {
    try {
      const res = await fetch(`${API}/courses/${courseId}/media/resource/access`, {
        headers: authHeaders,
      });

      if (res.status === 401) {
        goToLogin();
        return null;
      }

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        const msg = getErrorMessage(errBody, `Could not load the course content (status ${res.status}).`);
        showMediaMessage(msg);
        return null;
      }

      const data = await res.json();
      const media = normalizeList(data);

      if (!media) {
        showMediaMessage("Unexpected response format. Check the browser console.");
        return null;
      }

      const files = media.filter((item) => getItemUrl(item));

      if (!files.length && media.length) {
        console.log("Items have no usable url field:", media);
        showMediaMessage(
          "Content found but no file link in the response. Check the browser console.",
        );
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
     ====================================================== */
  function showResource(course, files) {
    if (!files || !files.length) {
      showMediaMessage("No course content has been uploaded yet.");
      return;
    }

    const videos = files.filter((item) => detectType(item) === "video");
    const pdfs = files.filter((item) => detectType(item) === "pdf");

    // Prefer the explicit course_resource_type from CoursePublicResponse;
    // fall back to inspecting the file URL/metadata if missing.
    let type = getCourseType(course);
    if (!type) {
      if (videos.length) type = "video";
      else if (pdfs.length) type = "pdf";
    }

    if (!type) {
      showMediaMessage("Unsupported course content format.");
      return;
    }

    mediaMsg.classList.add("hidden");

    if (type === "video") {
      const chosen = videos[0] || files[0];
      video.src = absoluteUrl(getItemUrl(chosen));
      video.load();

      videoBox.classList.remove("hidden");
      pdfBox.classList.add("hidden");
      pdf.removeAttribute("src");
      return;
    }

    const chosen = pdfs[0] || files[0];
    pdf.src = absoluteUrl(getItemUrl(chosen)) + "#view=FitH";

    pdfBox.classList.remove("hidden");
    videoBox.classList.add("hidden");
    video.removeAttribute("src");
    video.load();
  }

  async function loadContent() {
    showMediaMessage("Loading course content...");

    const [course, files] = await Promise.all([loadCourse(), loadMedia()]);

    if (files === null) return;

    showResource(course || {}, files);
  }

  /* ======================================================
     FIND THE STUDENT'S OWN REVIEW
     ====================================================== */
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
     GET /api/v1/courses/{id}/review
     ====================================================== */
  async function loadReviews() {
    try {
      const res = await fetch(`${API}/courses/${courseId}/review`, {
        headers: authHeaders,
      });

      if (!res.ok) {
        reviewList.innerHTML = "<p class='cv-empty'>Could not load reviews.</p>";
        return;
      }

      const reviews = await res.json();

      if (Array.isArray(reviews)) {
        const rated = reviews.filter((r) => r.rate != null);
        const sum = rated.reduce((acc, r) => acc + Number(r.rate || 0), 0);
        updateRatingSummary(rated.length, rated.length ? sum / rated.length : 0);

        if (!myReview && myName) {
          const sameName = reviews.filter((r) => getFullName(r) === myName);
          if (sameName.length === 1) {
            myReview = {
              comment: sameName[0].comment || "",
              rate: Number(sameName[0].rate),
            };
          }
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

      reviews.forEach((r) => {
        const fullName = getFullName(r);

        const item = document.createElement("div");
        item.className = "review-item";

        const avatar = document.createElement("div");
        avatar.className = "cv-avatar";
        avatar.textContent = getInitials(fullName);

        const body = document.createElement("div");
        body.className = "review-body";

        const header = document.createElement("div");
        header.className = "reviewer-header";

        const name = document.createElement("strong");
        name.textContent = fullName;

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
     STAR PICKER
     ====================================================== */
  let selectedRate = 0;
  const RATE_LABELS = ["Select a rating", "Poor", "Fair", "Good", "Very good", "Excellent"];

  function paintStars(count) {
    starButtons.forEach((btn) => {
      const value = Number(btn.getAttribute("data-value"));
      btn.classList.toggle("filled", value <= count);
    });
  }

  function setRating(value) {
    selectedRate = value;
    paintStars(selectedRate);
    starText.textContent = selectedRate
      ? `${selectedRate} / 5 - ${RATE_LABELS[selectedRate]}`
      : RATE_LABELS[0];
  }

  starButtons.forEach((btn) => {
    const value = Number(btn.getAttribute("data-value"));
    btn.addEventListener("mouseenter", () => paintStars(value));
    btn.addEventListener("click", () => setRating(value));
  });

  document.getElementById("cvStarPicker").addEventListener("mouseleave", () => {
    paintStars(selectedRate);
  });

  function showFormMessage(text, type) {
    formMsg.textContent = text;
    formMsg.className = `cv-form-msg ${type}`;
  }

  function showMyMessage(text, type) {
    myMsg.textContent = text;
    myMsg.className = `cv-my-msg ${type}`;
  }

  function resetForm() {
    setRating(0);
    commentInput.value = "";
    formMsg.className = "cv-form-msg hidden";
  }

  function updateReviewUI() {
    if (myReview && !isEditing) {
      renderStars(myStarsEl, myReview.rate);
      myCommentEl.textContent = myReview.comment;

      myReviewCard.classList.remove("hidden");
      reviewFormCard.classList.add("hidden");
      return;
    }

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

  editBtn.addEventListener("click", () => {
    if (!myReview) return;

    isEditing = true;
    setRating(myReview.rate);
    commentInput.value = myReview.comment;
    formMsg.className = "cv-form-msg hidden";
    myMsg.className = "cv-my-msg hidden";

    updateReviewUI();
    reviewFormCard.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  cancelBtn.addEventListener("click", () => {
    isEditing = false;
    resetForm();
    updateReviewUI();
  });

  /* ======================================================
     SUBMIT REVIEW (POST / PATCH)
     ====================================================== */
  submitBtn.addEventListener("click", async () => {
    const comment = commentInput.value.trim();

    if (selectedRate < 1) {
      showFormMessage("Please select a star rating first.", "error");
      return;
    }

    if (!comment) {
      showFormMessage("Please write a comment.", "error");
      return;
    }

    const wasEditing = isEditing;

    submitBtn.disabled = true;
    cancelBtn.disabled = true;
    submitBtn.textContent = wasEditing ? "Updating..." : "Submitting...";
    formMsg.className = "cv-form-msg hidden";

    try {
      const url = wasEditing
        ? `${API}/students/me/courses/${courseId}/review`
        : `${API}/courses/${courseId}/review`;

      const res = await fetch(url, {
        method: wasEditing ? "PATCH" : "POST",
        headers: {
          ...authHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          comment: comment,
          rate: selectedRate,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 401) {
        goToLogin();
        return;
      }

      if (!res.ok) {
        showFormMessage(
          getErrorMessage(data, "Could not save your review. Please try again."),
          "error",
        );
        return;
      }

      myReview = { comment: comment, rate: selectedRate };
      isEditing = false;
      resetForm();
      updateReviewUI();

      showMyMessage(
        wasEditing ? "Your review has been updated." : "Thank you! Your review has been submitted.",
        "success",
      );

      loadReviews();
    } catch (err) {
      console.log("Save review error:", err);
      showFormMessage("Network error. Please check your connection.", "error");
    } finally {
      submitBtn.disabled = false;
      cancelBtn.disabled = false;
      updateReviewUI();
    }
  });

  /* ======================================================
     DELETE REVIEW (DELETE)
     ====================================================== */
  deleteBtn.addEventListener("click", async () => {
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
        headers: authHeaders,
      });

      if (res.status === 401) {
        goToLogin();
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        showMyMessage(
          getErrorMessage(data, "Could not delete your review. Please try again."),
          "error",
        );
        return;
      }

      myReview = null;
      isEditing = false;
      resetForm();
      updateReviewUI();

      showFormMessage("Your review has been deleted.", "success");
      loadReviews();
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
     ====================================================== */
  async function loadReviewSection() {
    await loadMyName();
    await loadReviews();
    updateReviewUI();
  }

  loadContent();
  loadReviewSection();
})();