/* ==========================================================
   CONFIGURATION
   Change these values in ONE place if your setup changes.
   ========================================================== */

// Base URL of the FastAPI backend
const API_BASE_URL = "http://127.0.0.1:8000";

// Page the user is sent to after logging out.
// NOTE: change this to your real login page file name if it is different.
const LOGIN_PAGE = "login.html";

// The localStorage key where the login token is saved
const TOKEN_KEY = "access_token";

// The localStorage key where a course chosen BEFORE login is remembered
// (written by course_details.html). It can hold these flags:
//   purchase: true -> the visitor clicked Purchase and had to log in first
//   enrolled: true -> the payment just finished, show the course view
const PENDING_COURSE_KEY = "pending_course";

// A remembered course is only valid for 30 minutes
const PENDING_COURSE_MAX_AGE = 30 * 60 * 1000;

/* ==========================================================
   DEFAULT PROFILE PICTURES (by gender)
   When a user has NOT uploaded a photo, we draw a default avatar
   that matches the gender chosen at sign up:
     m -> male avatar   (blue)
     f -> female avatar (pink, long hair)
     o / unknown -> neutral avatar (green)
   The avatars are small inline SVG images, so no image file has to
   be downloaded and nothing can fail to load.
   ========================================================== */

// Colors of each avatar: background, body (head + shoulders) and hair
const AVATAR_THEMES = {
  m: { bg: "#dbeafe", body: "#2563eb", hair: "#1e3a8a" },
  f: { bg: "#fce7f3", body: "#db2777", hair: "#831843" },
  o: { bg: "#e3f3ee", body: "#096858", hair: null },
};

// The gender of the logged-in user (m / f / o).
// It is filled in when the profile is loaded, so buildPicUrl() knows
// which default avatar to use even when it is called with one argument.
window.currentUserGender = "";

/**
 * Returns a "data:" image URL containing the default avatar
 * for the given gender code (m / f / o, or male / female).
 */
function defaultAvatar(gender) {
  const g = String(gender || "").toLowerCase();

  // Decide which avatar to draw
  let key = "o";
  if (g === "m" || g === "male") key = "m";
  if (g === "f" || g === "female") key = "f";

  const t = AVATAR_THEMES[key];
  let hairBack = ""; // hair drawn BEHIND the head (long hair)
  let hairFront = ""; // hair drawn ON TOP of the head (fringe / short hair)

  if (key === "m") {
    // Short hair cap
    hairFront = `<path d="M69 76C67 50 84 40 100 40S133 50 131 76C124 64 114 58 100 58S76 64 69 76Z" fill="${t.hair}"/>`;
  }

  if (key === "f") {
    // Long hair falling behind the shoulders + a fringe on the forehead
    hairBack = `<path d="M64 84C62 48 80 38 100 38S138 48 136 84L142 140C130 134 124 126 122 112L78 112C76 126 70 134 58 140Z" fill="${t.hair}"/>`;
    hairFront = `<path d="M71 74C74 56 86 50 100 50S126 56 129 74C118 66 110 62 100 62S82 66 71 74Z" fill="${t.hair}"/>`;
  }

  // Order matters: background, back hair, shoulders, head, front hair
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">` +
    `<rect width="200" height="200" fill="${t.bg}"/>` +
    hairBack +
    `<path d="M40 200C40 140 70 124 100 124S160 140 160 200Z" fill="${t.body}"/>` +
    `<circle cx="100" cy="80" r="30" fill="${t.body}"/>` +
    hairFront +
    `</svg>`;

  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

/* ==========================================================
   SMALL HELPER FUNCTIONS
   ========================================================== */

/**
 * Safely writes text into an element found by its id.
 * Shows "-" when the value is empty so the UI never looks broken.
 */
function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.innerText = value || "-";
}

/**
 * Converts the short gender code from the database
 * (m / f / o) into a readable label.
 */
function formatGender(g) {
  const map = { m: "Male", f: "Female", o: "Other" };
  return map[g] || g || "-";
}

/**
 * Builds a full image URL from the path stored in the database.
 * - No path            -> default avatar for the user's gender
 * - Already a full URL -> use as is
 * - Relative path      -> prefix with the API address and add a
 *                         timestamp (?t=...) so the browser does not
 *                         show an old cached picture after an update.
 *
 * The second argument (gender) is optional. When it is left out, the
 * gender of the logged-in user (window.currentUserGender) is used.
 */
function buildPicUrl(path, gender) {
  if (!path) {
    return defaultAvatar(gender !== undefined ? gender : window.currentUserGender);
  }
  if (path.startsWith("http")) return path;
  return `${path.replace(/^\/+/, "")}?t=${Date.now()}`;
}

/* ==========================================================
   LOGOUT
   ========================================================== */

/**
 * Logs the user out:
 * 1. Deletes the saved login token (this is what "logs out" the user).
 * 2. Redirects to the login page.
 * We use location.replace() instead of location.href so the Back button
 * cannot return to the dashboard after logging out.
 */
function logoutUser() {
  localStorage.removeItem(TOKEN_KEY);
  window.location.replace(LOGIN_PAGE);
}

/* ==========================================================
   LOAD STUDENT PROFILE FROM THE API
   Fills the topbar (name + picture) and, if the settings page
   is open, the profile fields there as well.
   ========================================================== */
async function loadStudentProfile() {
  // Read the login token saved at login time
  const token = localStorage.getItem(TOKEN_KEY);

  // No token means the user is not logged in
  if (!token) {
    alert("Please login first.");
    return;
  }

  try {
    // Ask the backend for the current student's data.
    // The token goes in the Authorization header so the server knows who we are.
    const response = await fetch(`api/v1/students/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    // Any non-2xx status (401, 404, 500...) is treated as a failure
    if (!response.ok) {
      throw new Error("Failed to load profile (" + response.status + ")");
    }

    const data = await response.json();

    // Remember the gender FIRST, so every picture below (and in other
    // scripts such as update_profile.js) gets the right default avatar.
    window.currentUserGender = data.gender || "";

    // ---- Fill the settings page fields (they only exist when that page is loaded) ----
    setText("disp-id", data.user ? data.user.id : "");
    setText("disp-first-name", data.first_name);
    setText("disp-last-name", data.last_name);
    setText("disp-email", data.user ? data.user.email_id : "");
    setText("disp-phone", data.phone_no);
    setText("disp-gender", formatGender(data.gender));
    setText("disp-dob", data.date_of_birth);
    setText("disp-address", data.address);
    setText("disp-about", data.about);

    // Big profile picture on the settings page
    const pic = document.getElementById("disp-profile-pic");
    if (pic) pic.src = buildPicUrl(data.profile_pic, data.gender);

    // Small profile picture on the right side of the topbar
    const topPic = document.querySelector(".topbar .profile-img");
    if (topPic) topPic.src = buildPicUrl(data.profile_pic, data.gender);

    // Student's first name in the topbar welcome text
    const nameEl = document.getElementById("studentUserName");
    if (nameEl && data.first_name) nameEl.innerText = data.first_name;
  } catch (error) {
    console.error("Error fetching profile:", error);
  }
}

/* ==========================================================
   ENROLLMENT CHECK
   Returns true when the student has already purchased the course.

   /students/me contains the enrolled courses, so we simply look
   for the course id inside that answer. A course id is a unique id,
   so it can only appear there when the student owns the course.
   ========================================================== */
async function isEnrolledInCourse(courseId) {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return false;

  try {
    const response = await fetch(`api/v1/students/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return false;

    const data = await response.json();
    return JSON.stringify(data).includes(String(courseId));
  } catch (error) {
    console.error("Enrollment check failed:", error);
    return false;
  }
}

/* ==========================================================
   MAIN SETUP
   Runs once the HTML is fully loaded.
   ========================================================== */
document.addEventListener("DOMContentLoaded", () => {
  // ---- Grab all the elements we need ----

  // Only sidebar links that have a data-page attribute load a page.
  // Logout has no data-page, so it is excluded automatically.
  const navLinks = document.querySelectorAll(".nav-link[data-page]");

  const mainContent = document.getElementById("main-content");
  const menuToggle = document.getElementById("menuToggle");
  const sidebar = document.getElementById("sidebar");
  const sidebarOverlay = document.getElementById("sidebarOverlay");
  const logoutBtn = document.getElementById("logoutBtn");

  /**
   * Browsers do NOT run <script> tags inserted through innerHTML.
   * So we recreate each script element, which makes the browser run it.
   */
  function runScripts(container) {
    container.querySelectorAll("script").forEach((oldScript) => {
      const newScript = document.createElement("script");
      if (oldScript.getAttribute("src")) {
        // External script: copy the src
        newScript.src = oldScript.getAttribute("src");
      } else {
        // Inline script: copy its code
        newScript.textContent = oldScript.textContent;
      }
      // Swapping the old element for the new one triggers execution
      oldScript.replaceWith(newScript);
    });
  }

  /**
   * Downloads another HTML page (courses, quiz, settings...) and
   * shows it inside the content area, without reloading the whole site.
   */
  async function fetchAndRenderPage(pageUrl) {
    try {
      // Temporary message while the page is downloading
      mainContent.innerHTML = '<p style="color: #096858;">Loading page...</p>';

      const response = await fetch(pageUrl);
      if (!response.ok) {
        throw new Error(`Page not found (${response.status})`);
      }

      // Insert the downloaded HTML, then activate its scripts
      const htmlData = await response.text();
      mainContent.innerHTML = htmlData;
      runScripts(mainContent);

      // The settings page needs the profile data to be filled in
      if (pageUrl.includes("settings")) {
        loadStudentProfile();
      }

      // Start the new page from the top
      mainContent.scrollTop = 0;
    } catch (error) {
      // Show a friendly error box if the page could not be loaded
      mainContent.innerHTML = `
                <div style="color: #d9534f;">
                    <h2>ERROR!</h2>
                    <p>Page missing or local file issue. Please serve using Live Server.</p>
                </div>
            `;
      console.error("Fetch Error:", error);
    }
  }

  /**
   * Highlights the given sidebar link as "active"
   * and removes the highlight from all the others.
   */
  function updateActiveButton(targetLink) {
    navLinks.forEach((link) => link.classList.remove("active"));
    if (targetLink) {
      targetLink.classList.add("active");
    }
  }

  // Global helper so OTHER scripts (e.g. courses.js) can open a page
  // inside the dashboard: window.loadDashboardPage('quiz.html')
  window.loadDashboardPage = function (pageUrl) {
    const matchingNav = document.querySelector(`.nav-link[data-page="${pageUrl}"]`);
    updateActiveButton(matchingNav);
    fetchAndRenderPage(pageUrl);
  };

  // Global helper used after "Update Profile" is saved:
  // returns to the Settings page and refreshes the data.
  window.goToSettings = function () {
    const settingsLink = document.querySelector('.nav-link[data-page="settings.html"]');
    updateActiveButton(settingsLink);
    fetchAndRenderPage("settings.html");
    loadStudentProfile();
  };

  /**
   * Handles the course that was remembered by course_details.html.
   * Returns true when something was opened, false when nothing was pending.
   *
   *   1. enrolled flag (payment just finished) -> course view
   *   2. student already owns the course       -> course view
   *   3. purchase flag (came back from login)  -> go back to the course
   *      details page, which clicks "Purchase" automatically
   *   4. otherwise                             -> course details inside the dashboard
   */
  async function openPendingCourse() {
    const raw = localStorage.getItem(PENDING_COURSE_KEY);
    if (!raw) return false;

    // The remembered course is used only ONCE
    localStorage.removeItem(PENDING_COURSE_KEY);

    let pending = null;
    try {
      pending = JSON.parse(raw);
    } catch (error) {
      return false;
    }

    // Ignore broken or old (older than 30 minutes) entries
    if (!pending || !pending.id || Date.now() - pending.time > PENDING_COURSE_MAX_AGE) {
      return false;
    }

    // The course pages read the id from this key
    localStorage.setItem("selected_course_id", pending.id);

    // 1. Just purchased -> show the course view (no need to ask the server)
    if (pending.enrolled) {
      window.loadDashboardPage("course_view.html");
      return true;
    }

    // 2. Already owned -> show the course view
    if (await isEnrolledInCourse(pending.id)) {
      window.loadDashboardPage("course_view.html");
      return true;
    }

    // 3. The visitor wanted to buy it -> back to the course details page,
    //    where "Purchase" is clicked automatically
    if (pending.purchase) {
      window.location.replace(
        `course_details.html?id=${encodeURIComponent(pending.id)}&autopurchase=1`,
      );
      return true;
    }

    // 4. Plain course details inside the dashboard
    window.loadDashboardPage("course_details.html");
    return true;
  }

  /** Opens the normal first page (Settings if the URL ends with #settings, otherwise Courses). */
  function openDefaultPage() {
    if (window.location.hash === "#settings") {
      window.goToSettings();
    } else {
      fetchAndRenderPage("courses.html");
    }
  }

  // ---- Sidebar menu clicks (Courses, Quiz, Settings, Transactions) ----
  navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault(); // stop the browser from leaving the dashboard
      const pageToLoad = link.getAttribute("data-page");

      updateActiveButton(link);
      fetchAndRenderPage(pageToLoad);

      // On mobile, close the sidebar after choosing a page
      if (window.innerWidth <= 768) {
        sidebar.classList.remove("open");
        sidebarOverlay.classList.remove("active");
      }
    });
  });

  // ---- Logout button ----
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault(); // stop the "#logout" hash from being added to the URL
      logoutUser();
    });
  }

  // ---- Links INSIDE the loaded pages ----
  // Event delegation: one listener on the container handles clicks
  // from any link, even ones added later.
  mainContent.addEventListener("click", (e) => {
    const link = e.target.closest("a");
    // Ignore empty links and "#" anchors
    if (link && link.getAttribute("href") && !link.getAttribute("href").startsWith("#")) {
      e.preventDefault();
      const pageToLoad = link.getAttribute("href");

      // Highlight the matching sidebar item if there is one
      const matchingNav = document.querySelector(`.nav-link[data-page="${pageToLoad}"]`);
      updateActiveButton(matchingNav);

      fetchAndRenderPage(pageToLoad);
    }
  });

  // ---- Initial page load ----
  // 1. A remembered course (after login / after payment) -> handle it.
  // 2. Otherwise -> the normal first page.
  if (localStorage.getItem(PENDING_COURSE_KEY)) {
    openPendingCourse().then((opened) => {
      if (!opened) openDefaultPage();
    });
  } else {
    openDefaultPage();
  }

  // Load the name and picture for the topbar
  loadStudentProfile();

  // ---- Mobile sidebar open/close ----
  if (menuToggle && sidebarOverlay) {
    // Hamburger button toggles the sidebar and the dark backdrop
    menuToggle.addEventListener("click", () => {
      sidebar.classList.toggle("open");
      sidebarOverlay.classList.toggle("active");
    });

    // Tapping the dark backdrop closes the sidebar
    sidebarOverlay.addEventListener("click", () => {
      sidebar.classList.remove("open");
      sidebarOverlay.classList.remove("active");
    });
  }
});
