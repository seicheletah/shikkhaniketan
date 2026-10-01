(() => {

    const API = "http://127.0.0.1:8000/api/v1";
    const token = localStorage.getItem("access_token");

    // ড্যাশবোর্ডের ভেতরে খুললে URL-এ id থাকে না, তাই localStorage থেকে নিচ্ছি
    const params = new URLSearchParams(window.location.search);
    const courseId =
        localStorage.getItem("selected_course_id") ||
        params.get("id") ||
        params.get("course");

    const titleEl = document.getElementById("cdTitle");
    const detailsEl = document.getElementById("cdDetails");
    const priceEl = document.getElementById("cdPrice");
    const gstEl = document.getElementById("cdGst");
    const totalEl = document.getElementById("cdTotal");
    const reviewsBox = document.getElementById("reviewsTab");
    const overviewBox = document.getElementById("overviewTab");
    const purchaseBtn = document.getElementById("cdPurchaseBtn");

    let courseName = "";
    let coursePaid = true;

    if (!courseId) {
        titleEl.textContent = "Course not found!";
        return;
    }

    // ---------- BACK ----------
    document.getElementById("cdBackBtn").addEventListener("click", () => {
        if (typeof window.loadDashboardPage === "function") {
            window.loadDashboardPage("courses.html");
        } else {
            window.location.href = "student.html";
        }
    });

    // ---------- TABS ----------
    const tabButtons = document.querySelectorAll(".cd-tab-btn");

    tabButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const tab = btn.getAttribute("data-tab");

            tabButtons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");

            overviewBox.classList.toggle("hidden", tab !== "overview");
            reviewsBox.classList.toggle("hidden", tab !== "reviews");
        });
    });

    // ---------- PAID CHECK ----------
    function isPaid(course) {
        return (
            course.course_paid === true ||
            course.course_paid === 1 ||
            course.course_paid === "1" ||
            course.course_paid === "true"
        );
    }

    // ---------- COURSE ----------
    async function loadCourse() {
        try {
            const headers = { Accept: "application/json" };
            if (token) headers.Authorization = `Bearer ${token}`;

            const res = await fetch(`${API}/courses/${courseId}`, { headers });

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
            const gst = price * 0.18;
            const total = price + gst;

            priceEl.textContent = `₹${price}`;
            gstEl.textContent = `₹${gst.toFixed(2)}`;
            totalEl.textContent = `₹${total.toFixed(2)}`;

            purchaseBtn.textContent = coursePaid ? "Purchase" : "Start Learning";

            loadReviews();

        } catch (e) {
            console.log(e);
            titleEl.textContent = "Course load failed";
        }
    }

    // ---------- REVIEWS ----------
    async function loadReviews() {
        try {
            const headers = { Accept: "application/json" };
            if (token) headers.Authorization = `Bearer ${token}`;

            const res = await fetch(`${API}/courses/${courseId}/review`, { headers });

            if (!res.ok) return;

            const reviews = await res.json();

            reviewsBox.innerHTML = "<h3>Student Reviews</h3>";

            if (!reviews.length) {
                const p = document.createElement("p");
                p.textContent = "No reviews yet.";
                reviewsBox.appendChild(p);
                return;
            }

            reviews.forEach(r => {
                const item = document.createElement("div");
                item.className = "review-item";

                const name = document.createElement("strong");
                name.textContent = r.student_name || "Student";

                const rating = document.createElement("span");
                rating.className = "rating";
                rating.textContent = `⭐ ${r.rating}/5`;

                const text = document.createElement("p");
                text.textContent = r.review || "";

                item.append(name, rating, text);
                reviewsBox.appendChild(item);
            });

        } catch (e) {
            console.log(e);
        }
    }

    // ---------- GO TO COURSE VIEW ----------
    function goToCourseView() {
        localStorage.setItem("selected_course_id", courseId);

        if (typeof window.loadDashboardPage === "function") {
            window.loadDashboardPage("course_view.html");
        } else {
            window.location.href = `course_view.html?course=${courseId}`;
        }
    }

    // ---------- BUTTON STATE ----------
    function setBusy(busy, text) {
        purchaseBtn.disabled = busy;
        purchaseBtn.style.opacity = busy ? "0.7" : "1";
        purchaseBtn.style.cursor = busy ? "not-allowed" : "pointer";
        purchaseBtn.textContent = text || (coursePaid ? "Purchase" : "Start Learning");
    }

    // ---------- LOAD RAZORPAY SCRIPT ----------
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

    // ---------- VERIFY PAYMENT ----------
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

            // পেমেন্ট ভেরিফাই হয়েছে, এবার কোর্স ভিউ পেজে যাবে
            goToCourseView();

        } catch (err) {
            console.log(err);
            alert("Could not verify payment. Please check your connection.");
            setBusy(false);
        }
    }

    // ---------- PURCHASE ----------
    purchaseBtn.addEventListener("click", async () => {

        // লগইন না থাকলে সাইন আপ পেজে
        if (!token) {
            window.location.href = "sign_up.html";
            return;
        }

        // ফ্রি কোর্সে পেমেন্ট ছাড়াই কোর্স ভিউ
        if (!coursePaid) {
            goToCourseView();
            return;
        }

        setBusy(true, "Please wait...");

        try {
            // 1) ব্যাকএন্ডে অর্ডার তৈরি
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

                // আগেই কেনা থাকলে সরাসরি কোর্স ভিউতে নিয়ে যাবে
                if (/already|purchased|enrolled/i.test(msg)) {
                    goToCourseView();
                    return;
                }

                alert(msg);
                setBusy(false);
                return;
            }

            // 2) Razorpay স্ক্রিপ্ট লোড
            await loadRazorpayScript();

            // 3) Razorpay পেমেন্ট পপআপ
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

    // ---------- INIT ----------
    loadCourse();

})();