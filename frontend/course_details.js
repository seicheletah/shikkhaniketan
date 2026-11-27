/* ==========================================================
   course_details.js
   ========================================================== */
(() => {
  const API = "api/v1";
  const token = localStorage.getItem("access_token");

  const params = new URLSearchParams(window.location.search);
  const courseId =
    localStorage.getItem("selected_course_id") || params.get("id") || params.get("course");

  const titleEl = document.getElementById("cdTitle");
  const detailsEl = document.getElementById("cdDetails");
  const priceEl = document.getElementById("cdPrice");
  const totalEl = document.getElementById("cdTotal");
  const purchaseBtn = document.getElementById("cdPurchaseBtn");

  const thumbBox = document.getElementById("cdThumb");
  const thumbImg = document.getElementById("cdThumbImg");

  const avgNumberEl = document.getElementById("cdAvgNumber");
  const avgStarsEl = document.getElementById("cdAvgStars");
  const totalReviewsEl = document.getElementById("cdTotalReviews");
  const topStarsEl = document.getElementById("cdTopStars");
  const topRatingTextEl = document.getElementById("cdTopRatingText");
  const barsEl = document.getElementById("cdBars");
  const reviewListEl = document.getElementById("cdReviewList");

  let courseName = "";
  let coursePaid = true;

  if (!courseId) {
    titleEl.textContent = "Course not found!";
    return;
  }

  function getHeaders() {
    const headers = { Accept: "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }

  function renderStars(container, rating) {
    container.innerHTML = "";
    const rounded = Math.round(Number(rating) || 0);
    for (let i = 1; i <= 5; i++) {
      const star = document.createElement("span");
      star.textContent = "★";
      star.className = i <= rounded ? "cd-star-full" : "cd-star-empty";
      container.appendChild(star);
    }
  }

  function getFullName(review) {
    const full = `${review.first_name || ""} ${review.last_name || ""}`.trim();
    return full || "Student";
  }

  function getInitials(name) {
    const parts = String(name || "Student").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "S";
    const first = parts[0][0] || "";
    const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
    return (first + last).toUpperCase();
  }

  function isPaid(course) {
    return (
      course.course_paid === true ||
      course.course_paid === 1 ||
      course.course_paid === "1" ||
      course.course_paid === "true"
    );
  }

  function extractErrorMessage(data, fallback) {
    if (data && typeof data.detail === "string") return data.detail;
    if (data && Array.isArray(data.detail) && data.detail[0] && data.detail[0].msg) {
      return data.detail[0].msg;
    }
    return fallback;
  }

  function finishThumb(ok) {
    thumbBox.classList.remove("loading");
    if (ok) thumbBox.classList.add("loaded");
  }

  function showThumb(src) {
    thumbImg.onload = () => {
      thumbImg.hidden = false;
      finishThumb(true);
    };
    thumbImg.onerror = () => finishThumb(false);
    thumbImg.src = src;
  }

  async function loadThumbnail() {
    const url = `${API}/courses/${courseId}/media/thumbnail/access`;
    try {
      const res = await fetch(url, { headers: getHeaders() });
      if (!res.ok) {
        finishThumb(false);
        return;
      }

      const type = res.headers.get("content-type") || "";
      if (type.startsWith("image/")) {
        const blob = await res.blob();
        showThumb(URL.createObjectURL(blob));
        return;
      }

      const data = await res.json().catch(() => null);
      let src =
        typeof data === "string"
          ? data
          : data &&
            (data.stream_url ||
              data.url ||
              data.thumbnail_url ||
              data.presigned_url ||
              data.access_url);

      if (!src) {
        finishThumb(false);
        return;
      }

      if (!/^(https?:|blob:|data:)/i.test(src)) {
        src = new URL(src, new URL(API, window.location.href).origin).href;
      }

      showThumb(src);
    } catch (e) {
      finishThumb(false);
    }
  }

  async function loadCourse() {
    try {
      const res = await fetch(`${API}/courses/${courseId}`, { headers: getHeaders() });
      if (!res.ok) {
        titleEl.textContent = "Course load failed";
        return;
      }

      const course = await res.json();
      courseName = course.course_name || "";
      coursePaid = isPaid(course);

      titleEl.textContent = courseName;
      detailsEl.textContent = course.course_details || "";

      const price = coursePaid ? Number(course.course_price || 0) : 0;
      priceEl.textContent = `₹${price}`;
      totalEl.textContent = `₹${price}`;
      purchaseBtn.textContent = coursePaid ? "Purchase" : "Start Learning";

      loadThumbnail();
      loadRating();
      loadReviews();
    } catch (e) {
      titleEl.textContent = "Course load failed";
    }
  }

  async function loadRating() {
    try {
      const res = await fetch(`${API}/courses/${courseId}/rating`, { headers: getHeaders() });
      if (!res.ok) return;

      const data = await res.json();
      const total = Number(data.total_reviews) || 0;
      const average = Number(data.average_rating) || 0;

      avgNumberEl.textContent = average.toFixed(1);
      renderStars(avgStarsEl, average);
      totalReviewsEl.textContent = `${total} ${total === 1 ? "review" : "reviews"}`;

      renderStars(topStarsEl, average);
      topRatingTextEl.textContent = total
        ? `${average.toFixed(1)} average · ${total} ${total === 1 ? "review" : "reviews"}`
        : "No ratings yet";
    } catch (e) {
      console.log("Rating load error:", e);
    }
  }

  function renderBars(reviews) {
    barsEl.innerHTML = "";
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    reviews.forEach((r) => {
      const star = Math.min(5, Math.max(1, Math.round(Number(r.rate) || 0)));
      if (Number(r.rate)) counts[star] += 1;
    });

    const total = reviews.length;
    for (let star = 5; star >= 1; star--) {
      const percent = total ? (counts[star] / total) * 100 : 0;

      const row = document.createElement("div");
      row.className = "cd-bar-row";

      const label = document.createElement("div");
      label.className = "cd-bar-label";
      label.innerHTML = `${star} <span>★</span>`;

      const track = document.createElement("div");
      track.className = "cd-bar-track";

      const fill = document.createElement("div");
      fill.className = "cd-bar-fill";
      fill.style.width = `${percent}%`;
      track.appendChild(fill);

      const count = document.createElement("div");
      count.className = "cd-bar-count";
      count.textContent = counts[star];

      row.append(label, track, count);
      barsEl.appendChild(row);
    }
  }

  async function loadReviews() {
    renderBars([]);
    try {
      const res = await fetch(`${API}/courses/${courseId}/review`, { headers: getHeaders() });
      if (!res.ok) {
        reviewListEl.innerHTML = "<p class='cd-empty'>Could not load reviews.</p>";
        return;
      }

      const reviews = await res.json();
      reviewListEl.innerHTML = "";

      if (!Array.isArray(reviews) || !reviews.length) {
        reviewListEl.innerHTML = "<p class='cd-empty'>No reviews yet.</p>";
        return;
      }

      renderBars(reviews);

      reviews.forEach((r) => {
        const fullName = getFullName(r);

        const item = document.createElement("div");
        item.className = "review-item";

        const avatar = document.createElement("div");
        avatar.className = "cd-avatar";
        avatar.textContent = getInitials(fullName);

        const body = document.createElement("div");
        body.className = "review-body";

        const header = document.createElement("div");
        header.className = "review-header";

        const name = document.createElement("strong");
        name.textContent = fullName;

        const stars = document.createElement("span");
        stars.className = "cd-stars";
        renderStars(stars, r.rate);

        header.append(name, stars);

        const comment = document.createElement("p");
        comment.textContent = r.comment || "";

        body.append(header, comment);
        item.append(avatar, body);
        reviewListEl.appendChild(item);
      });
    } catch (e) {
      reviewListEl.innerHTML = "<p class='cd-empty'>Could not load reviews.</p>";
    }
  }

  function goToCourseView() {
    localStorage.setItem("selected_course_id", courseId);
    if (typeof window.loadDashboardPage === "function") {
      window.loadDashboardPage("course_view.html");
    } else {
      window.location.href = `course_view.html?course=${courseId}`;
    }
  }

  function setBusy(busy, text) {
    purchaseBtn.disabled = busy;
    purchaseBtn.style.opacity = busy ? "0.7" : "1";
    purchaseBtn.style.cursor = busy ? "not-allowed" : "pointer";
    purchaseBtn.textContent = text || (coursePaid ? "Purchase" : "Start Learning");
  }

  async function enrollFreeCourse() {
    setBusy(true, "Enrolling...");

    const endpoints = [
      `${API}/courses/${courseId}/purchase`,
      `${API}/courses/${courseId}/enroll`,
    ];

    let lastError = "Could not enroll in this free course.";

    for (const url of endpoints) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.status === 401) {
          window.location.href = "login.html";
          return;
        }

        const data = await res.json().catch(() => ({}));

        if (res.ok) {
          goToCourseView();
          return;
        }

        const msg = extractErrorMessage(data, lastError);
        if (/already|purchased|enrolled/i.test(msg)) {
          goToCourseView();
          return;
        }

        lastError = msg;
        if (res.status !== 400 && res.status !== 404 && res.status !== 405) {
          break;
        }
      } catch (err) {
        lastError = "Network error while enrolling. Please try again.";
        break;
      }
    }

    alert(lastError);
    setBusy(false);
  }

  function loadRazorpayScript() {
    return new Promise((resolve, reject) => {
      if (window.Razorpay) {
        resolve();
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Razorpay script load failed"));
      document.body.appendChild(script);
    });
  }

  async function verifyPayment(response) {
    setBusy(true, "Verifying payment...");
    try {
      const res = await fetch(`${API}/courses/verify-payment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
          course_id: courseId,
        }),
      });

      if (!res.ok) {
        alert("Payment verification failed. If money was deducted, please contact support.");
        setBusy(false);
        return;
      }

      goToCourseView();
    } catch (err) {
      alert("Could not verify payment. Please check your connection.");
      setBusy(false);
    }
  }

  purchaseBtn.addEventListener("click", async () => {
    if (!token) {
      window.location.href = "sign_up.html";
      return;
    }

    if (!coursePaid) {
      await enrollFreeCourse();
      return;
    }

    setBusy(true, "Please wait...");
    try {
      const res = await fetch(`${API}/courses/${courseId}/purchase`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const order = await res.json().catch(() => ({}));

      if (res.status === 401) {
        window.location.href = "login.html";
        return;
      }

      if (!res.ok) {
        const msg = extractErrorMessage(order, "Could not start payment.");
        if (/already|purchased|enrolled/i.test(msg)) {
          goToCourseView();
          return;
        }
        alert(msg);
        setBusy(false);
        return;
      }

      if (!order.id || Number(order.amount) === 0) {
        goToCourseView();
        return;
      }

      await loadRazorpayScript();

      const options = {
        key: order.key_id,
        amount: order.amount,
        currency: order.currency || "INR",
        order_id: order.id,
        name: "SkillHub",
        description: courseName || "Course Purchase",
        theme: { color: "#127c71" },
        handler: function (response) {
          verifyPayment(response);
        },
        modal: {
          ondismiss: function () {
            setBusy(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", function (resp) {
        alert(
          "Payment failed: " +
            (resp.error && resp.error.description ? resp.error.description : "Please try again.")
        );
        setBusy(false);
      });

      rzp.open();
    } catch (err) {
      alert("Something went wrong. Please try again.");
      setBusy(false);
    }
  });

  loadCourse();
})();