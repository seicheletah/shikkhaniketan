document.addEventListener("DOMContentLoaded", () => {

  const API_BASE = "http://127.0.0.1:8000/api/v1";
  const token = localStorage.getItem("access_token");

  if (!token) {
    window.location.href = "login.html";
    return;
  }

  const jsonHeaders = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json"
  };

  // ===== Top Bar =====
  const teacherProfileImg = document.getElementById("teacherProfileImg");
  const teacherUserName = document.getElementById("teacherUserName");

  // ===== Navigation =====
  const coursesLink = document.querySelector('[data-page="courses"]');
  const settingsLink = document.querySelector('[data-page="settings"]');
  const logoutLink = document.querySelector('[data-page="logout"]');

  const coursesSection = document.getElementById("courses");
  const settingsSection = document.getElementById("settings");

  // ===== Settings =====
  const teacherFirstName = document.getElementById("teacherFirstName");
  const teacherLastName = document.getElementById("teacherLastName");
  const teacherEmail = document.getElementById("teacherEmail");
  const teacherPhone = document.getElementById("teacherPhone");
  const teacherGender = document.getElementById("teacherGender");
  const teacherDob = document.getElementById("teacherDob");
  const teacherAddress = document.getElementById("teacherAddress");
  const teacherAbout = document.getElementById("teacherAbout");

  // ===== Form =====
  const addCourseForm = document.getElementById("addCourseForm");
  const courseNameInput = document.getElementById("courseName");
  const courseDetailsInput = document.getElementById("courseDetails");
  const languageInput = document.getElementById("language");
  const courseTypeInput = document.getElementById("courseType");
  const priceInput = document.getElementById("price");
  const thumbnailInput = document.getElementById("thumbnailInput");
  const fileInput = document.getElementById("fileInput");

  // ===== Section =====
  function showSection(section) {
    if (coursesSection)
      coursesSection.style.display = section === "courses" ? "block" : "none";

    if (settingsSection)
      settingsSection.style.display = section === "settings" ? "block" : "none";

    if (section === "settings") loadTeacherProfile();
  }

  coursesLink?.addEventListener("click", e => {
    e.preventDefault();
    showSection("courses");
  });

  settingsLink?.addEventListener("click", e => {
    e.preventDefault();
    showSection("settings");
  });

  // ===== Profile =====
  async function loadTeacherProfile() {
    try {
      const response = await fetch(`${API_BASE}/teachers/me`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json"
        }
      });

      if (response.status === 401) {
        localStorage.clear();
        window.location.href = "login.html";
        return;
      }

      if (!response.ok) throw new Error("Profile load failed");

      const data = await response.json();
      const fullName = `${data.first_name || ""} ${data.last_name || ""}`.trim();

      teacherUserName.textContent = fullName || "Teacher";
      teacherProfileImg.src = data.profile_pic || "https://i.pravatar.cc/150?img=47";

      teacherFirstName.textContent = data.first_name || "-";
      teacherLastName.textContent = data.last_name || "-";
      teacherEmail.textContent = data.user?.email_id || "-";
      teacherPhone.textContent = data.phone_no || "-";
      teacherGender.textContent = data.gender || "-";
      teacherDob.textContent = data.date_of_birth || "-";
      teacherAddress.textContent = data.address || "-";
      teacherAbout.textContent = data.about || "-";
    } catch (err) {
      console.error(err);
    }
  }

  // ===== Logout =====
  logoutLink?.addEventListener("click", e => {
    e.preventDefault();
    localStorage.clear();
    window.location.href = "login.html";
  });

  // ===== Price =====
  window.togglePriceField = value => {
    if (value === "paid") {
      priceInput.disabled = false;
      priceInput.required = true;
    } else {
      priceInput.disabled = true;
      priceInput.required = false;
      priceInput.value = "";
    }
  };

  // ===== File Name =====
  window.updateFileName = input => {
    if (input.files.length)
      console.log(input.files[0].name);
  };

  const ext = file => file.name.split(".").pop().toLowerCase();
  const nameOnly = file => file.name.replace(/\.[^/.]+$/, "");

  // ===== Upload =====
  async function uploadToS3(url, file) {
    const r = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file
    });

    if (!r.ok) throw new Error("Upload failed");
  }

  async function markReady(courseId, mediaId) {
    await fetch(`${API_BASE}/courses/${courseId}/media/${mediaId}/status`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }
    });
  }

  // ===== Create Course =====
  async function createCourse() {
    const body = {
      course_name: courseNameInput.value.trim(),
      course_details: courseDetailsInput.value.trim(),
      course_language: languageInput.value,
      course_paid: courseTypeInput.value === "paid",
      course_price: courseTypeInput.value === "paid" ? Number(priceInput.value) : 0,
      course_price_currency: "INR"
    };

    const res = await fetch(`${API_BASE}/courses/`, {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify(body)
    });

    if (!res.ok) throw new Error("Course create failed");
    return await res.json();
  }

  // ===== Thumbnail =====
  async function uploadThumbnail(courseId, file) {
    const res = await fetch(`${API_BASE}/courses/${courseId}/media/thumbnail/upload`, {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({
        category: "thumbnail",
        media_type: "image",
        file_name: nameOnly(file),
        file_extension: ext(file)
      })
    });

    const data = await res.json();
    await uploadToS3(data.upload_url, file);
    await markReady(courseId, data.media_id);
  }

  // ===== Resource =====
  async function uploadResource(courseId, file) {
    const mediaType = file.type.startsWith("video/") ? "video" : "document";

    const res = await fetch(`${API_BASE}/courses/${courseId}/media/resource/upload`, {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({
        category: "resource",
        media_type: mediaType,
        file_name: nameOnly(file),
        file_extension: ext(file)
      })
    });

    const data = await res.json();
    await uploadToS3(data.upload_url, file);
    await markReady(courseId, data.media_id);
  }

  // ===== Submit =====
  addCourseForm?.addEventListener("submit", async e => {
    e.preventDefault();

    try {
      const course = await createCourse();

      if (thumbnailInput.files.length)
        await uploadThumbnail(course.id, thumbnailInput.files[0]);

      if (fileInput.files.length)
        await uploadResource(course.id, fileInput.files[0]);

      alert("Course created successfully");
      addCourseForm.reset();
      priceInput.disabled = true;
    } catch (err) {
      alert(err.message);
    }
  });

  // ===== Init =====
  showSection("courses");
  loadTeacherProfile();

});