/* =========================================================
   index.js  (full file)

   What this file does:
   1. Shows skeleton cards instantly in the "Popular Courses" section.
   2. Loads ALL courses (video + document) from GET /api/v1/courses/
      and shows only the first 6, using the SAME card design as the
      explore page (teacher, rating, enrolled, comments, tags,
      language, price, thumbnail).
   3. Thumbnails load separately and fade in when ready.
   4. Header search: finds a course by name, moves it to the first
      position, highlights it for 3 seconds and scrolls to the section.
   5. "Explore All" link (in index.html) opens explore.html.

   NOTE: tag list is now inside this file (no tags.js needed).
   ========================================================= */

/* =========================================================
   TAGS  (আগে tags.js ফাইলে ছিল, এখন এই ফাইলের ভেতরেই)
   সব tag-এর তালিকা + tag-কে সুন্দর label-এ বদলানোর helper (tagLabel)
   ========================================================= */

window.SKILLHUB_TAGS = [
  "diploma","polytechnic_diploma","ba","bsc","bcom","btech","be","bca","bba","barch","bfa","bed",
  "mbbs","bds","bams","bhms","bpharma","bsc_nursing","llb","ba_llb","bba_llb","ma","msc","mcom",
  "mtech","me","mca","mba","md","ms_medical","llm","med","phd",
  "class_1","class_2","class_3","class_4","class_5","class_6","class_7","class_8","class_9",
  "class_10","class_11","class_12",
  "mathematics","algebra","geometry","calculus","trigonometry","statistics","discrete_math","logic",
  "computer_science","software_engineering","data_science","artificial_intelligence","cybersecurity",
  "web_development","mobile_development","data_structures","python","javascript","typescript","java",
  "c_sharp","c_plus_plus","go_lang","rust","swift","kotlin","php","ruby","sql",
  "physics","mechanics","thermodynamics","quantum_physics","astrophysics","chemistry","organic_chemistry",
  "inorganic_chemistry","biochemistry","biology","genetics","microbiology","ecology","astronomy",
  "earth_science","environmental_science",
  "psychology","cognitive_psychology","clinical_psychology","economics","microeconomics","macroeconomics",
  "sociology","political_science","anthropology","history","ancient_history","modern_history",
  "philosophy","ethics","literature","linguistics","creative_writing",
  "finance","corporate_finance","investment_banking","accounting","taxation","management",
  "project_management","human_resources","marketing","digital_marketing","seo_sem","entrepreneurship",
  "photography","music","music_theory","music_production","visual_arts","graphic_design","fine_arts",
  "electrical_engineering","mechanical_engineering","civil_engineering","architecture",
  "medicine","anatomy","pharmacology","nursing","law","constitutional_law","corporate_law",
  "education","pedagogy"
];

// এগুলো UPPER CASE-এ দেখাবে (ডিগ্রির নাম / acronym)
const UPPER_TAGS = new Set([
  "ba","bsc","bcom","btech","be","bca","bba","barch","bfa","bed","mbbs","bds","bams","bhms",
  "bpharma","llb","ma","msc","mcom","mtech","me","mca","mba","md","llm","med","phd","sql","php"
]);

// যে label সাধারণ নিয়মে বানানো যায় না
const SPECIAL_TAG_LABELS = {
  c_plus_plus: "C++",
  c_sharp: "C#",
  go_lang: "Go",
  ba_llb: "BA LLB",
  bba_llb: "BBA LLB",
  bsc_nursing: "BSc Nursing",
  ms_medical: "MS (Medical)",
  seo_sem: "SEO / SEM",
  polytechnic_diploma: "Polytechnic Diploma"
};

window.tagLabel = function (tag) {
  if (SPECIAL_TAG_LABELS[tag]) return SPECIAL_TAG_LABELS[tag];
  if (UPPER_TAGS.has(tag)) return tag.toUpperCase();
  // "class_10" -> "Class 10", "web_development" -> "Web Development"
  return tag.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
};


document.addEventListener("DOMContentLoaded", () => {

  // ---------------------------------------------------------
  // CONFIG
  // ---------------------------------------------------------
  const API_BASE = "http://127.0.0.1:8000/api/v1";
  const SHOW_COUNT = 6;                                  // how many courses on the home page
  const token = localStorage.getItem("access_token");   // optional

  // DOM elements
  const grid = document.getElementById("homeCourseGrid");
  const section = document.getElementById("popularCourses");
  const searchInput = document.querySelector(".search-box input");
  const searchButton = document.querySelector(".search-box i");

  let allCourses = [];     // every course returned by the API

  // =========================================================
  // SMALL HELPERS
  // =========================================================

  // Escape text so course data can never inject HTML
  const esc = str => String(str ?? "").replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // 1250 -> "1,250"
  const fmt = n => Number(n || 0).toLocaleString("en-IN");

  // Is this course paid? (handles true / 1 / "1" / "true")
  function isPaid(c) {
    return c.course_paid === true || c.course_paid === 1 ||
           c.course_paid === "1" || c.course_paid === "true";
  }

  // Price text: "Free" or "₹1,500"
  function priceText(c) {
    if (!isPaid(c)) return `<span class="price free">Free</span>`;
    const symbol = (c.course_price_currency || "INR") === "INR" ? "₹" : (c.course_price_currency + " ");
    return `<span class="price">${symbol}${fmt(c.course_price)}</span>`;
  }

  // 4.3 -> "★★★★☆"
  function starsText(rating) {
    const full = Math.min(5, Math.max(0, Math.round(Number(rating) || 0)));
    return "★".repeat(full) + "☆".repeat(5 - full);
  }

  // Thumbnail url from course.media (fallback only; the real url
  // comes from the /media/thumbnail/access endpoint below)
  function getThumbnail(course) {
    const media = (course.media || []).find(m => m.category === "thumbnail");
    if (!media) return "";
    return media.url || media.media_url || media.file_url ||
           media.signed_url || media.download_url || media.link || "";
  }

  // =========================================================
  // CARDS
  // =========================================================

  // Grey shimmer cards while data loads
  function skeletonCards(count = SHOW_COUNT) {
    return Array.from({ length: count }, () => `
      <div class="course-card skeleton">
        <div class="sk sk-thumb"></div>
        <div class="card-body">
          <div class="sk sk-line"></div>
          <div class="sk sk-line short"></div>
          <div class="sk sk-line"></div>
          <div class="sk sk-line short"></div>
        </div>
      </div>`).join("");
  }

  // One real course card (identical to the explore page)
  function courseCard(c, index) {
    const thumb = getThumbnail(c);
    const t = c.teacher || {};
    const teacherName = `${t.first_name || ""} ${t.last_name || ""}`.trim() || "Instructor";
    const tags = (c.course_tags || []).slice(0, 3);
    const extraTags = (c.course_tags || []).length - tags.length;

    // Images are never high priority: the card structure must show first
    const loading = `loading="lazy"`;

    return `
      <article class="course-card" data-id="${esc(c.id)}">

        <div class="card-thumb">
          <div class="thumb-loading"><span class="thumb-spinner"></span></div>
          <img data-thumb-id="${esc(c.id)}" ${thumb ? `src="${esc(thumb)}"` : ""} alt="${esc(c.course_name)}" ${loading} decoding="async">
        </div>

        <div class="card-body">
          <h3 class="card-title">${esc(c.course_name)}</h3>
          <p class="card-desc">${esc(c.course_details)}</p>

          <div class="teacher-row">
            ${t.profile_pic ? `<img src="${esc(t.profile_pic)}" alt="" loading="lazy">` : ""}
            <span>${esc(teacherName)}</span>
          </div>

          <div class="rating-row">
            <span class="rating-num">${Number(c.avg_rating || 0).toFixed(1)}</span>
            <span class="stars">${starsText(c.avg_rating)}</span>
            <span class="rating-count">(${fmt(c.total_rating)} ratings)</span>
          </div>

          <div class="meta-row">
            <span>👥 ${fmt(c.total_enrollment)} enrolled</span>
            <span>💬 ${fmt(c.total_comment)} comments</span>
          </div>

          <div class="tag-row">
            ${tags.map(tag => `<span class="tag-pill">${esc(tagLabel(tag))}</span>`).join("")}
            ${extraTags > 0 ? `<span class="tag-pill">+${extraTags}</span>` : ""}
          </div>

          <div class="card-footer">
            <span class="lang-badge">🌐 ${esc(c.course_language)}</span>
            ${priceText(c)}
          </div>
        </div>
      </article>`;
  }

  // Thumbnail fades in when loaded (event delegation)
  grid.addEventListener("load", e => {
    if (e.target.tagName === "IMG" && e.target.closest(".card-thumb")) {
      e.target.classList.add("loaded");
      e.target.closest(".card-thumb").classList.add("ready");
    }
  }, true);

  // If a thumbnail fails, remove it (placeholder stays)
  grid.addEventListener("error", e => {
    if (e.target.tagName === "IMG" && e.target.closest(".card-thumb")) {
      e.target.closest(".card-thumb").classList.add("failed");
      e.target.remove();
    }
  }, true);

  // Click on a card -> go to the login page
  grid.addEventListener("click", e => {
    const card = e.target.closest(".course-card[data-id]");
    if (!card) return;

    // remember which course was clicked (useful after login)
    localStorage.setItem("selected_course_id", card.dataset.id);
    window.location.href = "login.html";
  });

  // =========================================================
  // THUMBNAILS
  // GET /courses/{id}/media/thumbnail/access -> { course_id, stream_url }
  // =========================================================
  const thumbCache = new Map();

  function getThumbUrl(courseId) {
    if (!thumbCache.has(courseId)) {
      const p = fetch(`${API_BASE}/courses/${courseId}/media/thumbnail/access`, {
        headers: { Accept: "application/json" }
      })
        .then(res => (res.ok ? res.json() : Promise.reject(new Error(res.status))))
        .then(data => data.stream_url || "")
        .catch(() => { thumbCache.delete(courseId); return ""; });
      thumbCache.set(courseId, p);
    }
    return thumbCache.get(courseId);
  }

  // Fill the src of every card image that has no src yet (all in parallel)
  function loadThumbnails() {
    grid.querySelectorAll("img[data-thumb-id]:not([src])").forEach(async img => {
      const url = await getThumbUrl(img.dataset.thumbId);
      if (url && img.isConnected) img.src = url;
      else img.closest(".card-thumb")?.classList.add("failed");
    });
  }

  // =========================================================
  // THUMBNAIL SCHEDULER
  // আগে কার্ডের structure (নাম, details, price...) screen-এ আসে।
  // Browser সেটা আঁকার পরেই thumbnail download শুরু হয়,
  // তাই পেজ load হতে দেরি হয় না।
  // =========================================================
  function scheduleThumbnails() {
    requestAnimationFrame(() => {
      setTimeout(loadThumbnails, 150);
    });
  }

  // =========================================================
  // RENDER
  // =========================================================
  let highlightTimer = null;

  function renderCourses(coursesToShow = allCourses, highlightId = null) {
    const courses = coursesToShow.slice(0, SHOW_COUNT);

    if (!courses.length) {
      grid.innerHTML = `<div class="home-empty">No courses available right now.</div>`;
      return;
    }

    // Cards first (no waiting for thumbnails)
    grid.innerHTML = courses.map((c, i) => courseCard(c, i)).join("");

    // Highlight a searched course
    if (highlightId) {
      const card = grid.querySelector(`.course-card[data-id="${CSS.escape(String(highlightId))}"]`);
      if (card) card.classList.add("search-highlight");

      clearTimeout(highlightTimer);
      highlightTimer = setTimeout(() => {
        grid.querySelector(".search-highlight")?.classList.remove("search-highlight");
      }, 3000);
    }

    scheduleThumbnails();   // thumbnails come AFTER the cards are visible
  }

  // =========================================================
  // LOAD COURSES  (GET /courses/)
  // =========================================================
  async function loadCourses() {

    // Show skeletons immediately
    grid.innerHTML = skeletonCards();

    const headers = { Accept: "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;

    try {
      const res = await fetch(`${API_BASE}/courses/`, { headers });
      if (!res.ok) throw new Error(`Failed to load courses: ${res.status}`);

      const data = await res.json();
      allCourses = Array.isArray(data) ? data : (data.courses || []);

      renderCourses();

    } catch (error) {
      console.error("Course loading error:", error);
      grid.innerHTML = `<div class="home-empty">Could not load courses. Please try again later.</div>`;
    }
  }

  // =========================================================
  // HEADER SEARCH
  // =========================================================
  function searchCourse() {
    const text = searchInput.value.trim().toLowerCase();

    // Empty search -> normal first 6 courses
    if (!text) {
      renderCourses();
      return;
    }

    const matched = allCourses.find(c =>
      (c.course_name || "").toLowerCase().includes(text)
    );

    if (!matched) {
      renderCourses();
      return;
    }

    // Matched course goes first, the rest follow
    const others = allCourses.filter(c => String(c.id) !== String(matched.id));
    renderCourses([matched, ...others], matched.id);

    section.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  searchButton.addEventListener("click", searchCourse);

  searchInput.addEventListener("keydown", e => {
    if (e.key === "Enter") searchCourse();
  });

  // =========================================================
  // INIT
  // =========================================================
  loadCourses();
});