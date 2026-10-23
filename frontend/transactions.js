/* ==========================================================
   transactions.js
   Logic of the Transactions page (opened inside the student dashboard).

   What this file does, step by step:
   1. Reads the login token from localStorage.
   2. Calls   GET /api/v1/students/me/transactions
      -> list of purchases:
         [{ id, razorpay_order_id, razorpay_payment_id, student_id,
            course_id, amount, created_at }]
   3. For every purchase it calls   GET /api/v1/courses/{course_id}
      to get the course name, details and language.
   4. Draws one modern card per purchased course (the structure,
      name, price and details appear first).
   5. Loads the course thumbnails slowly in the background.
   6. When the student clicks the download button on a card it calls
         GET /api/v1/students/me/transactions/{id}/invoice
      (returns a PDF), and saves that PDF on the student's device.

   Everything is wrapped in an IIFE (Immediately Invoked Function
   Expression) so our variables never leak into the global scope and
   never clash with other page scripts (courses.js, course_view.js ...).
   ========================================================== */
(() => {

    /* ------------------------------------------------------
       CONFIGURATION  (change values here, in ONE place)
       ------------------------------------------------------ */

    // Base address of the FastAPI backend
    const API_BASE = "http://127.0.0.1:8000/api/v1";

    // Endpoint that returns the logged-in student's purchases
    const TRANSACTIONS_ENDPOINT = `${API_BASE}/students/me/transactions`;

    // Picture used when a course has no thumbnail (or it fails to load)
    const DEFAULT_THUMB = "image/myyy.png";

    // If your backend stores "amount" in paise (Razorpay style, 100 paise = 1 rupee)
    // change this number to 100. If it already stores rupees, keep it 1.
    const AMOUNT_DIVISOR = 1;

    // How many thumbnails may download at the same moment.
    // A small number keeps the browser free for other requests.
    const THUMB_CONCURRENCY = 3;

    // How long (ms) the small pop-up message stays on screen
    const TOAST_DURATION = 3000;


    /* ------------------------------------------------------
       LOGIN TOKEN
       ------------------------------------------------------ */
    const token = localStorage.getItem("access_token");


    /* ------------------------------------------------------
       DOM ELEMENTS
       ------------------------------------------------------ */
    const grid = document.getElementById("txGrid");           // where cards go
    const summary = document.getElementById("txSummary");     // the two stat cards
    const countEl = document.getElementById("txCount");       // "courses purchased" number
    const totalEl = document.getElementById("txTotal");       // "total spent" number
    const toast = document.getElementById("txToast");         // small pop-up message

    let toastTimer = null; // remembers the running toast timer


    /* ==========================================
       SMALL HELPERS
       ========================================== */

    /** Headers for every request that needs the login token. */
    function getAuthHeaders() {
        const headers = { Accept: "application/json" };
        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }
        return headers;
    }

    /**
     * Makes text safe before putting it inside innerHTML.
     * Without this, a course name like "<script>..." could run code.
     */
    function escapeHtml(value) {
        return String(value === undefined || value === null ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    /** Converts the backend amount into rupees (see AMOUNT_DIVISOR). */
    function toRupees(amount) {
        return (Number(amount) || 0) / AMOUNT_DIVISOR;
    }

    /** 1499 -> "₹1,499"   (Indian number format) */
    function formatMoney(rupees) {
        return "₹" + rupees.toLocaleString("en-IN", { maximumFractionDigits: 2 });
    }

    /** "2026-10-23T07:11:46.807Z" -> "23 Oct 2026" */
    function formatDate(isoString) {
        if (!isoString) return "-";
        const date = new Date(isoString);
        if (isNaN(date.getTime())) return "-";
        return date.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    }

    /** Shows a small pop-up message. type = "success" | "error" */
    function showToast(message, type) {
        toast.textContent = message;
        toast.className = "tx-toast " + (type === "error" ? "error" : "");

        // Restart the hide-timer if a toast is already visible
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => {
            toast.classList.add("hidden");
        }, TOAST_DURATION);
    }

    /** Replaces the grid content with a spinning circle. */
    function showLoader() {
        grid.innerHTML = `
            <div class="tx-loader">
                <div class="tx-spinner"></div>
                <p>Loading your transactions...</p>
            </div>
        `;
    }

    /** Replaces the grid content with an icon + message (empty / error state). */
    function showMessage(iconClass, text, isError) {
        grid.innerHTML = `
            <div class="tx-message ${isError ? "error" : ""}">
                <i class="${iconClass}"></i>
                <p>${escapeHtml(text)}</p>
            </div>
        `;
    }


    /* ==========================================
       LOAD THE PURCHASE LIST
       ========================================== */

    /**
     * Returns the array of transactions, newest first.
     * Throws an Error if the request fails (the caller shows a message).
     */
    async function loadTransactions() {
        const res = await fetch(TRANSACTIONS_ENDPOINT, {
            method: "GET",
            headers: getAuthHeaders()
        });

        // 401 = token missing / expired
        if (res.status === 401) {
            throw new Error("Your session has expired. Please login again.");
        }

        if (!res.ok) {
            throw new Error(`Failed to load transactions (status ${res.status}).`);
        }

        const data = await res.json();

        // The API returns a plain array; be safe if it is wrapped in an object
        const list = Array.isArray(data) ? data : (data.transactions || data.items || []);

        // Newest purchase first
        return list.slice().sort((a, b) => {
            return new Date(b.created_at || 0) - new Date(a.created_at || 0);
        });
    }


    /* ==========================================
       LOAD COURSE DETAILS (name, description, language)
       ========================================== */

    // The same course may appear in more than one transaction.
    // We remember the answer so we never ask the server twice.
    const courseCache = new Map(); // courseId -> Promise<course | null>

    /** Fetches one course. Returns null when it cannot be loaded. */
    function getCourse(courseId) {
        if (!courseCache.has(courseId)) {
            const request = fetch(`${API_BASE}/courses/${courseId}`, {
                headers: getAuthHeaders()
            })
                .then(res => (res.ok ? res.json() : null))
                .catch(() => null);

            courseCache.set(courseId, request);
        }
        return courseCache.get(courseId);
    }


    /* ==========================================
       THUMBNAILS (loaded slowly AFTER the cards are visible)
       ========================================== */

    /** Asks the backend for the thumbnail link of one course. */
    async function getThumbnailUrl(courseId) {
        try {
            const res = await fetch(
                `${API_BASE}/courses/${courseId}/media/thumbnail/access`,
                { method: "GET", headers: getAuthHeaders() }
            );

            if (!res.ok) return DEFAULT_THUMB;

            const data = await res.json();
            return (data && data.stream_url) ? data.stream_url : DEFAULT_THUMB;

        } catch (error) {
            console.log(`Thumbnail error for course ${courseId}:`, error);
            return DEFAULT_THUMB;
        }
    }

    /**
     * Loads thumbnails one small group at a time (THUMB_CONCURRENCY at once).
     * `items` is a list of { courseId, img } where img is the <img> element.
     */
    async function loadThumbnailsInBackground(items) {
        let nextIndex = 0; // the next item that nobody has started yet

        // A "worker" keeps taking the next item until nothing is left
        async function worker() {
            while (nextIndex < items.length) {
                const item = items[nextIndex++];
                const url = await getThumbnailUrl(item.courseId);

                item.img.onerror = () => {
                    item.img.onerror = null;          // avoid an endless error loop
                    item.img.src = DEFAULT_THUMB;
                };
                item.img.src = url;
            }
        }

        // Start several workers side by side
        const workers = [];
        for (let i = 0; i < THUMB_CONCURRENCY; i++) {
            workers.push(worker());
        }
        await Promise.all(workers);
    }


    /* ==========================================
       INVOICE DOWNLOAD
       ========================================== */

    /**
     * Tries to read the file name the server suggests, e.g.
     * Content-Disposition: attachment; filename="invoice_123.pdf"
     * Returns null when the header is missing.
     */
    function getFileNameFromResponse(res) {
        const header = res.headers.get("Content-Disposition") || "";
        const match = header.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
        return match ? decodeURIComponent(match[1]) : null;
    }

    /**
     * Calls the invoice API, receives the PDF and saves it on the device.
     * The API needs the Bearer token, so we cannot use a plain <a href>.
     * Instead: fetch -> blob -> temporary link -> click -> remove.
     */
    async function downloadInvoice(transaction, button) {

        // Disable the button + show a spinner icon so nobody double-clicks
        const originalHtml = button.innerHTML;
        button.disabled = true;
        button.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating...';

        try {
            const res = await fetch(
                `${TRANSACTIONS_ENDPOINT}/${transaction.id}/invoice`,
                { method: "GET", headers: { Authorization: `Bearer ${token}` } }
            );

            if (!res.ok) {
                throw new Error(`Invoice request failed (status ${res.status}).`);
            }

            // The PDF file as raw data
            const blob = await res.blob();

            // File name: use the server's name, otherwise build our own
            const fileName =
                getFileNameFromResponse(res) ||
                `invoice-${String(transaction.id).slice(0, 8)}.pdf`;

            // Create a temporary invisible link that points to the PDF data
            const blobUrl = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = blobUrl;
            link.download = fileName;          // this makes the browser SAVE the file
            document.body.appendChild(link);
            link.click();                      // start the download
            link.remove();

            // Free the memory a moment later
            setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);

            showToast("Invoice downloaded successfully.", "success");

        } catch (error) {
            console.log("Invoice download error:", error);
            showToast("Could not download the invoice. Please try again.", "error");

        } finally {
            // Always give the button back to the user
            button.disabled = false;
            button.innerHTML = originalHtml;
        }
    }


    /* ==========================================
       RENDER
       ========================================== */

    /** Builds ONE card element for one transaction + its course. */
    function buildCard(transaction, course) {

        const card = document.createElement("article");
        card.className = "tx-card";

        // If the course could not be loaded, show a safe fallback text
        const name = course ? (course.course_name || "Untitled course") : "Course unavailable";
        const details = course ? (course.course_details || "") : "Details could not be loaded.";
        const language = course ? (course.course_language || "-") : "-";

        const amount = toRupees(transaction.amount);

        card.innerHTML = `
            <div class="tx-thumb-wrap">
                <img class="tx-thumb" src="${DEFAULT_THUMB}" alt="${escapeHtml(name)}">
                <span class="tx-paid-badge">
                    <i class="fa-solid fa-circle-check"></i> Paid
                </span>
            </div>

            <div class="tx-body">
                <h3 class="tx-course-name">${escapeHtml(name)}</h3>
                <p class="tx-course-desc">${escapeHtml(details)}</p>

                <ul class="tx-info">
                    <li>
                        <i class="fa-solid fa-language"></i>
                        <span>${escapeHtml(language)}</span>
                    </li>
                    <li>
                        <i class="fa-regular fa-calendar"></i>
                        <span>${formatDate(transaction.created_at)}</span>
                    </li>
                    <li title="${escapeHtml(transaction.razorpay_payment_id)}">
                        <i class="fa-solid fa-hashtag"></i>
                        <span>${escapeHtml(transaction.razorpay_payment_id || "-")}</span>
                    </li>
                </ul>
            </div>

            <div class="tx-footer">
                <div>
                    <span class="tx-price-label">Amount paid</span>
                    <span class="tx-price">${formatMoney(amount)}</span>
                </div>

                <button type="button" class="tx-download-btn" title="Download invoice">
                    <i class="fa-solid fa-download"></i> Invoice
                </button>
            </div>
        `;

        // Connect the download button of THIS card to THIS transaction
        const button = card.querySelector(".tx-download-btn");
        button.addEventListener("click", () => downloadInvoice(transaction, button));

        return card;
    }

    /** Fills the two summary cards (count + total spent). */
    function renderSummary(transactions) {
        const total = transactions.reduce((sum, t) => sum + toRupees(t.amount), 0);

        countEl.textContent = transactions.length;
        totalEl.textContent = formatMoney(total);

        summary.classList.remove("hidden");
    }


    /* ==========================================
       START
       ========================================== */
    async function init() {

        // Not logged in -> nothing to show
        if (!token) {
            showMessage("fa-solid fa-lock", "Please login to see your transactions.", true);
            return;
        }

        showLoader();

        try {
            // 1) The purchase list
            const transactions = await loadTransactions();

            if (!transactions.length) {
                showMessage("fa-regular fa-folder-open", "You have not purchased any course yet.", false);
                return;
            }

            // 2) Course details for every purchase, all requests in parallel
            const courses = await Promise.all(
                transactions.map(t => getCourse(t.course_id))
            );

            // 3) Draw the summary and all cards at once
            renderSummary(transactions);

            grid.innerHTML = "";
            const thumbJobs = [];

            transactions.forEach((transaction, index) => {
                const card = buildCard(transaction, courses[index]);
                grid.appendChild(card);

                // Remember which <img> belongs to which course
                thumbJobs.push({
                    courseId: transaction.course_id,
                    img: card.querySelector(".tx-thumb")
                });
            });

            // 4) Thumbnails come last, slowly, in the background
            loadThumbnailsInBackground(thumbJobs);

        } catch (error) {
            console.log("Transactions error:", error);
            showMessage("fa-solid fa-triangle-exclamation", error.message || "Something went wrong.", true);
        }
    }

    init();

})();