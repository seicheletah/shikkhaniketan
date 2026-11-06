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
   4. Draws one numbered ROW per purchased course (1, 2, 3 ...), with the
      download button at the right end (name, price and details appear first).
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

    // Razorpay (and so our backend) stores "amount" in PAISE, not rupees.
    // 100 paise = 1 rupee, so 59900 in the database means Rs. 599.
    // We divide by 100 before showing the price.
    // (If you ever store rupees directly, change this back to 1.)
    const AMOUNT_DIVISOR = 100;

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
        button.textContent = "Generating...";

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

    /* ---- Small inline SVG icons (no FontAwesome needed, they always show) ---- */
    const ICON_LANGUAGE =
        '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>';

    const ICON_CALENDAR =
        '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>';

    const ICON_HASH =
        '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="4" y1="9" x2="20" y2="9"></line><line x1="4" y1="15" x2="20" y2="15"></line><line x1="10" y1="3" x2="8" y2="21"></line><line x1="16" y1="3" x2="14" y2="21"></line></svg>';

    const ICON_CHECK =
        '<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>';

    const ICON_DOWNLOAD =
        '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>';

    /**
     * Builds ONE list row for one transaction + its course.
     * `number` is the position in the list (1, 2, 3 ...).
     * Layout (left -> right): number, thumbnail, name/details/info, price, download button.
     */
    function buildRow(transaction, course, number) {

        const row = document.createElement("article");
        row.className = "tx-row";

        // If the course could not be loaded, show a safe fallback text
        const name = course ? (course.course_name || "Untitled course") : "Course unavailable";
        const details = course ? (course.course_details || "") : "Details could not be loaded.";
        const language = course ? (course.course_language || "-") : "-";

        const amount = toRupees(transaction.amount);

        row.innerHTML = `
            <div class="tx-num">${number}</div>

            <div class="tx-thumb-wrap">
                <img class="tx-thumb" src="${DEFAULT_THUMB}" alt="${escapeHtml(name)}">
            </div>

            <div class="tx-info-block">
                <h3 class="tx-course-name">${escapeHtml(name)}</h3>
                <p class="tx-course-desc">${escapeHtml(details)}</p>

                <ul class="tx-meta">
                    <li>${ICON_LANGUAGE}<span>${escapeHtml(language)}</span></li>
                    <li>${ICON_CALENDAR}<span>${formatDate(transaction.created_at)}</span></li>
                    <li title="${escapeHtml(transaction.razorpay_payment_id)}">
                        ${ICON_HASH}<span>${escapeHtml(transaction.razorpay_payment_id || "-")}</span>
                    </li>
                </ul>
            </div>

            <div class="tx-price-block">
                <span class="tx-paid-badge">${ICON_CHECK} Paid</span>
                <span class="tx-price-label">Amount paid</span>
                <span class="tx-price">${formatMoney(amount)}</span>
            </div>

            <button type="button" class="tx-download-btn" title="Download invoice">
                ${ICON_DOWNLOAD} Invoice
            </button>
        `;

        // Connect the download button of THIS row to THIS transaction
        const button = row.querySelector(".tx-download-btn");
        button.addEventListener("click", () => downloadInvoice(transaction, button));

        return row;
    }

    /** Fills the two summary chips in the green banner (count + total spent). */
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

            // 3) Draw the summary and all rows at once
            renderSummary(transactions);

            grid.innerHTML = "";
            const thumbJobs = [];

            transactions.forEach((transaction, index) => {
                // index + 1 -> the visible row number: 1, 2, 3 ...
                const row = buildRow(transaction, courses[index], index + 1);
                grid.appendChild(row);

                // Remember which <img> belongs to which course
                thumbJobs.push({
                    courseId: transaction.course_id,
                    img: row.querySelector(".tx-thumb")
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