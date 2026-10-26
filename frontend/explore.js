/* ===== TAGS (list + label helper) – now inside this file ===== */
/* =========================================================
   tags.js
   Shared by add_course.html and explore.html.
   Contains every tag value accepted by the API (course_tags /
   search "tags" query) and a helper that turns a raw value like
   "web_development" into a nice label like "Web Development".
   Load this file BEFORE add_course.js / explore.js.
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

// Values that should be shown in UPPER CASE (degree names / acronyms)
const UPPER_TAGS = new Set([
  "ba","bsc","bcom","btech","be","bca","bba","barch","bfa","bed","mbbs","bds","bams","bhms",
  "bpharma","llb","ma","msc","mcom","mtech","me","mca","mba","md","llm","med","phd","sql","php"
]);

// Special labels that cannot be produced by the simple rule
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


/* =========================================================
   explore.js  (full file)

   What this file does:
   1. Draws the whole page structure FIRST (skeleton cards), so the user
      never waits on a blank page.
   2. Calls  GET /api/v1/courses/search  with the active filters:
        name, tags (repeated), language, paid, type, limit, offset
   3. Renders each course as a modern Udemy-style card.
      Thumbnails are loaded lazily and fade in when ready.
   4. Left sidebar: a separate search box that filters ONLY the filter
      list (tags), plus Language and Price filters.
   5. Top search box searches COURSES by name (debounced).
   6. Shows "No courses found" when the result is empty.
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

  // ---------------------------------------------------------
  // CONFIG
  // ---------------------------------------------------------
  const API_BASE = "http://127.0.0.1:8000/api/v1";
  const PAGE_SIZE = 12;                          // courses loaded per request
  const token = localStorage.getItem("access_token");   // optional: sent if present

  const $ = id => document.getElementById(id);

  // DOM elements
  const grid = $("courseGrid");
  const emptyState = $("emptyState");
  const emptyTitle = $("emptyTitle");
  const emptyText = $("emptyText");
  const resultCount = $("resultCount");
  const loadMoreBtn = $("loadMoreBtn");
  const courseSearch = $("courseSearch");
  const filterSearch = $("filterSearch");
  const tagFilterList = $("tagFilterList");

  // ---------------------------------------------------------
  // STATE – everything the API needs lives here
  // ---------------------------------------------------------
  const state = {
    name: "",
    tags: new Set(),      // selected tag values
    language: "",
    paid: "",             // "" | "true" | "false"
    type: "video",        // video | document  (the tabs)
    offset: 0,
    loaded: 0
  };

  let requestId = 0;      // used to ignore outdated responses

  // =========================================================
  // SMALL HELPERS
  // =========================================================

  // Escape text so course data can never inject HTML
  const esc = str => String(str ?? "").replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // Debounce: run fn only after the user stops typing
  function debounce(fn, ms = 350) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  }

  // Format numbers: 1250 -> "1,250"
  const fmt = n => Number(n || 0).toLocaleString("en-IN");

  // Price text: "Free" or "₹1,500"
  function priceText(c) {
    if (!c.course_paid) return `<span class="price free">Free</span>`;
    const symbol = (c.course_price_currency || "INR") === "INR" ? "₹" : (c.course_price_currency + " ");
    return `<span class="price">${symbol}${fmt(c.course_price)}</span>`;
  }

  // 4.3 -> "★★★★☆"
  function starsText(rating) {
    const full = Math.round(Number(rating) || 0);
    return "★".repeat(full) + "☆".repeat(5 - full);
  }

  // Find the thumbnail url inside course.media.
  // NOTE: the Swagger example only shows { id, category }.
  // We try the most common url field names – edit here if yours is different.
  function getThumbnail(course) {
    const media = (course.media || []).find(m => m.category === "thumbnail");
    if (!media) return "";
    return media.url || media.media_url || media.file_url ||
           media.signed_url || media.download_url || media.link || "";
  }

  // =========================================================
  // CARD RENDERING
  // =========================================================

  // Skeleton (grey shimmer) cards shown instantly while data loads
  function skeletonCards(count = 8) {
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

  // One real course card – shows EVERY detail the API returns
  function courseCard(c, index) {
    const thumb = getThumbnail(c);
    const t = c.teacher || {};
    const teacherName = `${t.first_name || ""} ${t.last_name || ""}`.trim() || "Instructor";
    const tags = (c.course_tags || []).slice(0, 3);
    const extraTags = (c.course_tags || []).length - tags.length;

    // The first 4 images load with high priority, the rest lazily
    const loading = index < 4 ? `loading="eager" fetchpriority="high"` : `loading="lazy"`;

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

  // Fade thumbnails in when they finish loading (event delegation)
  grid.addEventListener("load", e => {
    if (e.target.tagName === "IMG" && e.target.closest(".card-thumb")) {
      e.target.classList.add("loaded");
      e.target.closest(".card-thumb").classList.add("ready");    // stop shimmer + spinner
    }
  }, true);

  // If a thumbnail fails, just remove it (the placeholder stays visible)
  grid.addEventListener("error", e => {
    if (e.target.tagName === "IMG" && e.target.closest(".card-thumb")) {
      e.target.closest(".card-thumb").classList.add("failed");   // plain soft box, no icon
      e.target.remove();
    }
  }, true);

  // Click on a card -> open the course page
  // Opens course_details.html?id=<course id>
  grid.addEventListener("click", e => {
    const card = e.target.closest(".course-card[data-id]");
    if (card) {
      // course_details.js reads this value first, so it must be the clicked course
      localStorage.setItem("selected_course_id", card.dataset.id);

      // Inside a dashboard (student / teacher): open the details page in the content area,
      // exactly like your student dashboard already does.
      if (typeof window.loadDashboardPage === "function") {
        window.loadDashboardPage("course_details.html");
      } else {
        // Opened as a normal page (no dashboard around it)
        window.location.href = `course_details.html?id=${card.dataset.id}`;
      }
    }
  });

  // =========================================================
  // THUMBNAILS
  // The course list does NOT contain the image url. The url comes from:
  //   GET /courses/{course_id}/media/thumbnail/access  ->  { course_id, stream_url }
  // We call it for every visible card IN PARALLEL, and cache the result
  // so the same course is never requested twice.
  // =========================================================
  const thumbCache = new Map();     // courseId -> Promise<stream_url>

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

  // Fill the src of every card image that does not have one yet
  function loadThumbnails() {
    grid.querySelectorAll("img[data-thumb-id]:not([src])").forEach(async img => {
      const url = await getThumbUrl(img.dataset.thumbId);
      if (url && img.isConnected) img.src = url;     // fades in via the "load" listener
      else img.closest(".card-thumb")?.classList.add("failed");
    });
  }

  // =========================================================
  // FETCH COURSES  (GET /courses/search)
  // =========================================================
  async function fetchCourses({ append = false } = {}) {
    const myRequest = ++requestId;

    if (!append) {
      // New search: reset paging and show skeleton cards immediately
      state.offset = 0;
      state.loaded = 0;
      grid.innerHTML = skeletonCards();
      emptyState.hidden = true;
      loadMoreBtn.hidden = true;
      resultCount.textContent = "Loading...";
    } else {
      loadMoreBtn.disabled = true;
      loadMoreBtn.textContent = "Loading...";
    }

    // Build the query string from the state
    const params = new URLSearchParams();
    if (state.name) params.append("name", state.name);
    state.tags.forEach(tag => params.append("tags", tag));   // tags=mba&tags=python
    if (state.language) params.append("language", state.language);
    if (state.paid !== "") params.append("paid", state.paid);
    params.append("type", state.type);
    params.append("limit", PAGE_SIZE);
    params.append("offset", state.offset);

    const headers = { Accept: "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;

    try {
      const res = await fetch(`${API_BASE}/courses/search?${params}`, { headers });

      // A newer request was started meanwhile -> ignore this old answer
      if (myRequest !== requestId) return;

      if (!res.ok) throw new Error(`Server error (${res.status})`);
      const courses = await res.json();

      if (!append) grid.innerHTML = "";

      // Render cards
      grid.insertAdjacentHTML(
        "beforeend",
        courses.map((c, i) => courseCard(c, state.loaded + i)).join("")
      );

      loadThumbnails();                       // fetch thumbnail urls right away

      state.loaded += courses.length;
      state.offset += courses.length;

      // Empty result
      if (state.loaded === 0) {
        showEmpty("No courses found", "Try changing your search or filters.");
        resultCount.textContent = "0 courses";
      } else {
        emptyState.hidden = true;
        resultCount.textContent = `${state.loaded}${courses.length === PAGE_SIZE ? "+" : ""} courses`;
      }

      // Show "Load more" only if the last page was full
      loadMoreBtn.hidden = courses.length < PAGE_SIZE;
      loadMoreBtn.disabled = false;
      loadMoreBtn.textContent = "Load more courses";

    } catch (err) {
      if (myRequest !== requestId) return;
      console.error("Search error:", err);
      if (!append) grid.innerHTML = "";
      showEmpty("Could not load courses", "Please check your connection and try again.");
      resultCount.textContent = "";
      loadMoreBtn.disabled = false;
      loadMoreBtn.textContent = "Load more courses";
    }
  }

  function showEmpty(title, text) {
    emptyTitle.textContent = title;
    emptyText.textContent = text;
    emptyState.hidden = false;
  }

  // =========================================================
  // LEFT SIDEBAR – TAG FILTER LIST
  // =========================================================

  // Draw tag checkboxes. `query` filters ONLY this list (not the courses).
  function renderTagFilters(query = "") {
    const q = query.trim().toLowerCase();

    const list = window.SKILLHUB_TAGS.filter(tag =>
      tagLabel(tag).toLowerCase().includes(q) || tag.includes(q)
    );

    if (!list.length) {
      tagFilterList.innerHTML = `<div class="filter-empty">No filter found</div>`;
      return;
    }

    tagFilterList.innerHTML = list.map(tag => `
      <label>
        <input type="checkbox" value="${tag}" ${state.tags.has(tag) ? "checked" : ""}>
        ${esc(tagLabel(tag))}
      </label>`).join("");
  }

  // Search inside the filter list only
  filterSearch.addEventListener("input", () => renderTagFilters(filterSearch.value));

  // Tick / untick a tag -> reload courses
  tagFilterList.addEventListener("change", e => {
    if (e.target.type !== "checkbox") return;
    e.target.checked ? state.tags.add(e.target.value) : state.tags.delete(e.target.value);
    fetchCourses();
  });

  // Language radio buttons
  $("languageFilter").addEventListener("change", e => {
    state.language = e.target.value;
    fetchCourses();
  });

  // Free / Paid radio buttons
  $("paidFilter").addEventListener("change", e => {
    state.paid = e.target.value;
    fetchCourses();
  });

  // "Clear all" – reset every filter and the search boxes
  $("clearFilters").addEventListener("click", () => {
    state.tags.clear();
    state.language = "";
    state.paid = "";
    state.name = "";
    courseSearch.value = "";
    filterSearch.value = "";
    document.querySelector('input[name="language"][value=""]').checked = true;
    document.querySelector('input[name="paid"][value=""]').checked = true;
    renderTagFilters();
    fetchCourses();
  });

  // =========================================================
  // TOP SEARCH – searches courses by name
  // =========================================================
  courseSearch.addEventListener("input", debounce(() => {
    state.name = courseSearch.value.trim();
    fetchCourses();
  }));

  // =========================================================
  // VIDEO / DOCUMENT TABS
  // =========================================================
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      state.type = btn.dataset.type;
      fetchCourses();
    });
  });

  // =========================================================
  // LOAD MORE (pagination using offset)
  // =========================================================
  loadMoreBtn.addEventListener("click", () => fetchCourses({ append: true }));

  // =========================================================
  // INIT – structure first (skeletons), then data
  // =========================================================
  renderTagFilters();
  fetchCourses();
});