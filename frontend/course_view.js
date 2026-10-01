(() => {

    const API = "http://127.0.0.1:8000/api/v1";

    const token = localStorage.getItem("access_token");
    const role = localStorage.getItem("userRole");

    // Account না থাকলে Course View খুলবে না
    if (!token || role !== "student") {
        window.location.href = "sign_up.html";
        return;
    }

    // ড্যাশবোর্ডের ভেতরে URL-এ id থাকে না, তাই localStorage থেকে নিচ্ছি
    const params = new URLSearchParams(window.location.search);
    const courseId =
        localStorage.getItem("selected_course_id") ||
        params.get("course") ||
        params.get("id");

    const video = document.querySelector("#videoPlayerBox video");
    const pdf = document.querySelector("#pdfReaderBox iframe");

    const titleEl = document.getElementById("cvTitle");
    const overviewEl = document.getElementById("cvOverview");
    const reviewBox = document.getElementById("reviewsTab");
    const overviewBox = document.getElementById("overviewTab");

    const authHeaders = {
        Authorization: `Bearer ${token}`,
        Accept: "application/json"
    };

    // ================= BACK =================
    document.getElementById("cvBackBtn").addEventListener("click", () => {
        if (typeof window.loadDashboardPage === "function") {
            window.loadDashboardPage("course_details.html");
        } else {
            window.location.href = "student.html";
        }
    });

    // ================= VIDEO / PDF TAB =================
    const mediaButtons = document.querySelectorAll(".toggle-btn");

    mediaButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const type = btn.getAttribute("data-media");

            mediaButtons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");

            document.getElementById("videoPlayerBox")
                .classList.toggle("hidden", type !== "video");
            document.getElementById("pdfReaderBox")
                .classList.toggle("hidden", type !== "pdf");
        });
    });

    // ================= OVERVIEW / REVIEW TAB =================
    const tabButtons = document.querySelectorAll(".cv-tab-btn");

    tabButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const tab = btn.getAttribute("data-tab");

            tabButtons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");

            overviewBox.classList.toggle("hidden", tab !== "overview");
            reviewBox.classList.toggle("hidden", tab !== "reviews");
        });
    });

    if (!courseId) {
        titleEl.textContent = "Course not found!";
        return;
    }

    // ================= LOAD COURSE =================
    async function loadCourse() {
        try {
            const res = await fetch(`${API}/courses/${courseId}`, {
                headers: authHeaders
            });

            if (!res.ok) return;

            const course = await res.json();

            titleEl.textContent = course.course_name || "";
            overviewEl.textContent = course.course_details || "";

            loadMedia();
            loadReviews();

        } catch (err) {
            console.log(err);
        }
    }

    // ================= COURSE RESOURCES (টিচারের আপলোড করা ফাইল) =================
    const resourceList = document.getElementById("cvResourceList");

    function getResourceName(item, index) {
        const direct =
            item.file_name || item.filename || item.original_name ||
            item.original_filename || item.title || item.name;

        if (direct) return direct;

        // access_url থেকে ফাইলের নাম বের করার চেষ্টা
        try {
            const path = new URL(item.access_url, window.location.href).pathname;
            const last = decodeURIComponent(path.split("/").filter(Boolean).pop() || "");
            if (last && last.includes(".")) return last;
        } catch (e) { /* ignore */ }

        return item.media_type === "video"
            ? `Video ${index + 1}`
            : `Document ${index + 1}`;
    }

    function renderResources(media) {
        if (!resourceList) return;

        resourceList.innerHTML = "";

        const files = media.filter(item => item && item.access_url);

        if (!files.length) {
            const li = document.createElement("li");
            li.textContent = "No resources uploaded yet.";
            resourceList.appendChild(li);
            return;
        }

        files.forEach((item, index) => {
            const li = document.createElement("li");

            const icon = document.createElement("i");
            icon.className = item.media_type === "video"
                ? "fa-solid fa-circle-play"
                : "fa-solid fa-file-arrow-down";

            const link = document.createElement("a");
            link.href = item.access_url;
            link.target = "_blank";
            link.rel = "noopener";
            link.textContent = getResourceName(item, index);

            li.append(icon, link);
            resourceList.appendChild(li);
        });
    }

    // ================= VIDEO / PDF =================
    async function loadMedia() {
        try {
            const res = await fetch(
                `${API}/courses/${courseId}/media/resource/access`,
                { headers: authHeaders }
            );

            if (!res.ok) {
                if (resourceList) resourceList.innerHTML = "<li>Could not load resources.</li>";
                return;
            }

            const media = await res.json();

            if (!Array.isArray(media)) return;

            renderResources(media);

            media.forEach(item => {

                if (item.media_type === "video") {
                    video.src = item.access_url;
                    video.load();
                }

                if (item.media_type === "document") {
                    pdf.src = item.access_url;
                }

            });

        } catch (err) {
            console.log(err);
        }
    }

    // ================= REVIEWS =================
    async function loadReviews() {
        try {
            const res = await fetch(`${API}/courses/${courseId}/review`, {
                headers: authHeaders
            });

            if (!res.ok) return;

            const reviews = await res.json();

            reviewBox.innerHTML = "<h3>Student Feedback</h3>";

            if (!reviews.length) {
                const p = document.createElement("p");
                p.textContent = "No reviews yet.";
                reviewBox.appendChild(p);
                return;
            }

            reviews.forEach(r => {
                const item = document.createElement("div");
                item.className = "review-item";

                const header = document.createElement("div");
                header.className = "reviewer-header";

                const name = document.createElement("strong");
                name.textContent = r.student_name || "Student";

                const rating = document.createElement("span");
                rating.className = "rating";
                rating.textContent = `⭐ ${r.rating}/5`;

                header.append(name, rating);

                const text = document.createElement("p");
                text.textContent = r.review || "";

                item.append(header, text);
                reviewBox.appendChild(item);
            });

        } catch (err) {
            console.log(err);
        }
    }

    // ================= INIT =================
    loadCourse();

})();