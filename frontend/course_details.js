/* ==========================================================
   course_details.js
   Shows one course (Udemy-style page):
     - title, description, price (with GST)
     - thumbnail image loaded from the backend (AWS S3 via API)
     - average rating, rating bars (5..1 stars), total reviews
     - list of student reviews
   The Purchase button starts a Razorpay payment (unchanged logic).

   API used (exactly as in the backend docs):
     GET /courses/{id}                          -> course data
     GET /courses/{id}/media/thumbnail/access   -> thumbnail (see loadThumbnail)
     GET /courses/{id}/rating  -> { total_reviews, average_rating, course_id }
     GET /courses/{id}/review  -> [{ comment, rate, first_name, last_name, course_id }]
   ========================================================== */
(() => {

    const API = "http://127.0.0.1:8000/api/v1";
    const token = localStorage.getItem("access_token");

    // Inside the dashboard the URL has no id, so we read it from localStorage
    // (courses.js stores it there when a card is clicked).
    const params = new URLSearchParams(window.location.search);
    const courseId =
        localStorage.getItem("selected_course_id") ||
        params.get("id") ||
        params.get("course");

    /* ------------------------------------------------------
       DOM ELEMENTS
       ------------------------------------------------------ */
    const titleEl = document.getElementById("cdTitle");
    const detailsEl = document.getElementById("cdDetails");
    const priceEl = document.getElementById("cdPrice");
    const gstEl = document.getElementById("cdGst");
    const totalEl = document.getElementById("cdTotal");
    const purchaseBtn = document.getElementById("cdPurchaseBtn");

    // Thumbnail
    const thumbBox = document.getElementById("cdThumb");
    const thumbImg = document.getElementById("cdThumbImg");

    // Rating UI
    const avgNumberEl = document.getElementById("cdAvgNumber");
    const avgStarsEl = document.getElementById("cdAvgStars");
    const totalReviewsEl = document.getElementById("cdTotalReviews");
    const topStarsEl = document.getElementById("cdTopStars");
    const topRatingTextEl = document.getElementById("cdTopRatingText");
    const barsEl = document.getElementById("cdBars");
    const reviewListEl = document.getElementById("cdReviewList");

    let courseName = "";
    let coursePaid = true;

    // Without an id we cannot load anything
    if (!courseId) {
        titleEl.textContent = "Course not found!";
        return;
    }


    /* ------------------------------------------------------
       SMALL HELPERS
       ------------------------------------------------------ */

    /** Headers for GET requests (token is optional on this page). */
    function getHeaders() {
        const headers = { Accept: "application/json" };
        if (token) headers.Authorization = `Bearer ${token}`;
        return headers;
    }

    /**
     * Draws 5 stars inside `container`, e.g. rating 3 -> ★★★☆☆ (filled = gold).
     * `rating` can be a decimal (4.4); it is rounded to the nearest whole star.
     */
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

    /** Builds "First Last" from the API fields, with a safe fallback. */
    function getFullName(review) {
        const full = `${review.first_name || ""} ${review.last_name || ""}`.trim();
        return full || "Student";
    }

    /** "Soumya Shuvra De" -> "SD" (used inside the round avatar). */
    function getInitials(name) {
        const parts = String(name || "Student").trim().split(/\s+/).filter(Boolean);
        if (!parts.length) return "S";
        const first = parts[0][0] || "";
        const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
        return (first + last).toUpperCase();
    }

    /** The backend may send the paid flag as true / 1 / "1" / "true". */
    function isPaid(course) {
        return (
            course.course_paid === true ||
            course.course_paid === 1 ||
            course.course_paid === "1" ||
            course.course_paid === "true"
        );
    }


    /* ------------------------------------------------------
       BACK BUTTON
       ------------------------------------------------------ */
    document.getElementById("cdBackBtn").addEventListener("click", () => {
        if (typeof window.loadDashboardPage === "function") {
            window.loadDashboardPage("courses.html");
        } else {
            window.location.href = "student.html";
        }
    });


    /* ------------------------------------------------------
       LOAD THUMBNAIL
       GET /courses/{id}/media/thumbnail/access
       Docs: returns application/json -> { course_id, stream_url }
       stream_url is the S3 address of the picture.

       IMPORTANT: a 404 here means the backend has NO thumbnail that is
       marked "ready" for this course. In that case the placeholder icon
       stays visible (that is the correct behaviour). The exact status and
       reply are printed in the browser Console as "Thumbnail: ..." so you
       can see what the backend said.
       ------------------------------------------------------ */

    /** Marks the thumbnail as finished loading (hides the shimmer). */
    function finishThumb(ok) {
        thumbBox.classList.remove("loading");
        if (ok) thumbBox.classList.add("loaded");
    }

    /** Puts an image address into the <img> and shows it once it has loaded. */
    function showThumb(src) {
        thumbImg.onload = () => {
            thumbImg.hidden = false;
            finishThumb(true);
        };
        thumbImg.onerror = () => {
            console.log("Thumbnail: the image address could not be loaded:", src);
            finishThumb(false);                // keep the placeholder
        };
        thumbImg.src = src;
    }

    async function loadThumbnail() {
        const url = `${API}/courses/${courseId}/media/thumbnail/access`;

        try {
            const res = await fetch(url, { headers: getHeaders() });

            // 404 / 401 / 403 / 422 ... -> keep the placeholder, print the reason
            if (!res.ok) {
                const text = await res.text().catch(() => "");
                console.log(`Thumbnail: server answered ${res.status} for ${url}`, text);
                finishThumb(false);
                return;
            }

            const type = res.headers.get("content-type") || "";

            // Case 1: the backend sent the image itself
            if (type.startsWith("image/")) {
                const blob = await res.blob();
                showThumb(URL.createObjectURL(blob));
                return;
            }

            // Case 2 (documented): JSON with the image address inside
            const data = await res.json().catch(() => null);

            let src =
                typeof data === "string"
                    ? data
                    : data && (
                        data.stream_url ||
                        data.url ||
                        data.thumbnail_url ||
                        data.presigned_url ||
                        data.access_url
                    );

            if (!src) {
                console.log("Thumbnail: reply had no usable URL:", data);
                finishThumb(false);
                return;
            }

            // If the backend sent a relative path, make it absolute using the API server
            if (!/^(https?:|blob:|data:)/i.test(src)) {
                src = new URL(src, new URL(API).origin).href;
            }

            showThumb(src);

        } catch (e) {
            console.log("Thumbnail load error:", e);
            finishThumb(false);
        }
    }


    /* ------------------------------------------------------
       LOAD COURSE (title, description, price)
       ------------------------------------------------------ */
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

            // Price calculation: price + 18% GST = total
            const price = coursePaid ? Number(course.course_price || 0) : 0;
            const gst = price * 0.18;
            const total = price + gst;

            priceEl.textContent = `₹${price}`;
            gstEl.textContent = `₹${gst.toFixed(2)}`;
            totalEl.textContent = `₹${total.toFixed(2)}`;

            purchaseBtn.textContent = coursePaid ? "Purchase" : "Start Learning";

            // Thumbnail, ratings and reviews load after the course itself
            loadThumbnail();
            loadRating();
            loadReviews();

        } catch (e) {
            console.log(e);
            titleEl.textContent = "Course load failed";
        }
    }


    /* ------------------------------------------------------
       LOAD RATING SUMMARY
       GET /courses/{id}/rating -> { total_reviews, average_rating, course_id }
       ------------------------------------------------------ */
    async function loadRating() {
        try {
            const res = await fetch(`${API}/courses/${courseId}/rating`, { headers: getHeaders() });

            if (!res.ok) return;

            const data = await res.json();

            const total = Number(data.total_reviews) || 0;
            const average = Number(data.average_rating) || 0;

            // Big number + stars + total inside the rating box
            avgNumberEl.textContent = average.toFixed(1);
            renderStars(avgStarsEl, average);
            totalReviewsEl.textContent = `${total} ${total === 1 ? "review" : "reviews"}`;

            // Small line under the course title (head section)
            renderStars(topStarsEl, average);
            topRatingTextEl.textContent = total
                ? `${average.toFixed(1)} average · ${total} ${total === 1 ? "review" : "reviews"}`
                : "No ratings yet";

        } catch (e) {
            console.log("Rating load error:", e);
        }
    }


    /* ------------------------------------------------------
       RATING BARS (5 stars ... 1 star)
       The API gives no per-star counts, so we count them from the
       review list that is already loaded.
       ------------------------------------------------------ */
    function renderBars(reviews) {
        barsEl.innerHTML = "";

        // counts[5] = how many reviews gave 5 stars, and so on
        const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

        reviews.forEach(r => {
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


    /* ------------------------------------------------------
       LOAD REVIEW LIST
       GET /courses/{id}/review
       -> [{ comment, rate, first_name, last_name, course_id }]
       ------------------------------------------------------ */
    async function loadReviews() {
        // Draw empty bars first so the box never looks broken
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

            // Fill the rating bars from the real reviews
            renderBars(reviews);

            reviews.forEach(r => {
                const fullName = getFullName(r);

                // Outer row
                const item = document.createElement("div");
                item.className = "review-item";

                // Round avatar with initials
                const avatar = document.createElement("div");
                avatar.className = "cd-avatar";
                avatar.textContent = getInitials(fullName);

                // Right side: name + stars + comment
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

                // textContent (not innerHTML) keeps user comments safe from HTML injection
                const comment = document.createElement("p");
                comment.textContent = r.comment || "";

                body.append(header, comment);
                item.append(avatar, body);
                reviewListEl.appendChild(item);
            });

        } catch (e) {
            console.log("Review load error:", e);
            reviewListEl.innerHTML = "<p class='cd-empty'>Could not load reviews.</p>";
        }
    }


    /* ------------------------------------------------------
       PURCHASE FLOW (unchanged)
       ------------------------------------------------------ */

    /** Opens the course view page (after purchase or for free courses). */
    function goToCourseView() {
        localStorage.setItem("selected_course_id", courseId);

        if (typeof window.loadDashboardPage === "function") {
            window.loadDashboardPage("course_view.html");
        } else {
            window.location.href = `course_view.html?course=${courseId}`;
        }
    }

    /** Disables / enables the purchase button and changes its text. */
    function setBusy(busy, text) {
        purchaseBtn.disabled = busy;
        purchaseBtn.style.opacity = busy ? "0.7" : "1";
        purchaseBtn.style.cursor = busy ? "not-allowed" : "pointer";
        purchaseBtn.textContent = text || (coursePaid ? "Purchase" : "Start Learning");
    }

    /** Loads the Razorpay checkout script only when it is needed. */
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

    /** After paying, ask the backend to verify the payment signature. */
    async function verifyPayment(response) {
        setBusy(true, "Verifying payment...");

        try {
            const res = await fetch(`${API}/courses/verify-payment`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_signature: response.razorpay_signature,
                    course_id: courseId
                })
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                console.log("Verify error:", data);
                alert("Payment verification failed. If money was deducted, please contact support.");
                setBusy(false);
                return;
            }

            // Payment verified -> open the course
            goToCourseView();

        } catch (err) {
            console.log(err);
            alert("Could not verify payment. Please check your connection.");
            setBusy(false);
        }
    }

    purchaseBtn.addEventListener("click", async () => {

        // Not logged in -> go to sign up
        if (!token) {
            window.location.href = "sign_up.html";
            return;
        }

        // Free course -> no payment needed
        if (!coursePaid) {
            goToCourseView();
            return;
        }

        setBusy(true, "Please wait...");

        try {
            // 1) Ask the backend to create a Razorpay order
            const res = await fetch(`${API}/courses/${courseId}/purchase`, {
                method: "POST",
                headers: {
                    Accept: "application/json",
                    Authorization: `Bearer ${token}`
                }
            });

            const order = await res.json().catch(() => ({}));

            if (res.status === 401) {
                window.location.href = "login.html";
                return;
            }

            if (!res.ok) {
                console.log("Purchase error:", order);

                const msg = typeof order.detail === "string"
                    ? order.detail
                    : "Could not start payment.";

                // Already purchased -> just open the course
                if (/already|purchased|enrolled/i.test(msg)) {
                    goToCourseView();
                    return;
                }

                alert(msg);
                setBusy(false);
                return;
            }

            // 2) Load the Razorpay script
            await loadRazorpayScript();

            // 3) Open the Razorpay payment popup
            const options = {
                key: order.key_id,
                amount: order.amount,
                currency: order.currency || "INR",
                order_id: order.id,
                name: "SkillHub",
                description: courseName || "Course Purchase",
                theme: { color: "#127c71" },

                // Called when the payment succeeds
                handler: function (response) {
                    verifyPayment(response);
                },

                // Called when the user closes the popup
                modal: {
                    ondismiss: function () {
                        setBusy(false);
                    }
                }
            };

            const rzp = new window.Razorpay(options);

            rzp.on("payment.failed", function (resp) {
                console.log("Payment failed:", resp.error);
                alert("Payment failed: " + (resp.error && resp.error.description
                    ? resp.error.description
                    : "Please try again."));
                setBusy(false);
            });

            rzp.open();

        } catch (err) {
            console.log(err);
            alert("Something went wrong. Please try again.");
            setBusy(false);
        }
    });


    /* ------------------------------------------------------
       START
       ------------------------------------------------------ */
    loadCourse();

})();