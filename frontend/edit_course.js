document.addEventListener("DOMContentLoaded", () => {

    const API = "http://127.0.0.1:8000/api/v1";
    const token = localStorage.getItem("access_token");

    // ---------------- AUTH CHECK ----------------

    if (!token) {
        location.href = "login.html";
        return;
    }

    // ---------------- GET COURSE ID ----------------

    const params = new URLSearchParams(window.location.search);
    const courseId = params.get("id");

    if (!courseId) {

        alert("Course ID not found.");
        location.href = "teacher.html";

        return;
    }

    // ---------------- ELEMENTS ----------------

    const form = document.getElementById("courseForm");

    const courseNameInput =
        document.getElementById("courseName");

    const courseDetailsInput =
        document.getElementById("courseDetails");

    const coursePriceInput =
        document.getElementById("coursePrice");

    const langText =
        document.getElementById("langText");

    const typeText =
        document.getElementById("typeText");

    const toast =
        document.getElementById("toast");

    // NEW: elements of the "Delete course" feature
    const deleteCourseBtn =
        document.getElementById("deleteCourseBtn");   // red button in the danger zone

    const deleteModal =
        document.getElementById("deleteModal");       // dark overlay + pop-up

    const dcCourseName =
        document.getElementById("dcCourseName");      // course name inside the pop-up text

    const dcCancelBtn =
        document.getElementById("dcCancelBtn");       // "No, keep it"

    const dcConfirmBtn =
        document.getElementById("dcConfirmBtn");      // "Yes, delete"

    // NEW: remembers the name of the loaded course so the pop-up can show it
    let loadedCourseName = "";

    // ---------------- HEADERS ----------------

    function headers() {

        return {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
            "Content-Type": "application/json"
        };

    }

    // ---------------- TOAST ----------------

    function showToast(message, bgColor = "#0f4c5c") {

        if (!toast) return;

        toast.textContent = message;
        toast.style.backgroundColor = bgColor;

        toast.classList.add("show");

        setTimeout(() => {

            toast.classList.remove("show");

        }, 3000);

    }

    // ---------------- DROPDOWN ----------------

    window.toggleDropdown = function (containerId) {

        const container =
            document.getElementById(containerId);

        if (!container) return;

        const isAlreadyOpen =
            container.classList.contains("is-open");

        document
            .querySelectorAll(".custom-dropdown-container")
            .forEach(el => {

                el.classList.remove("is-open");

            });

        if (!isAlreadyOpen) {

            container.classList.add("is-open");

        }

    };

    // ---------------- SELECT OPTION ----------------

    window.selectOption = function (
        containerId,
        textElementId,
        value
    ) {

        const textElement =
            document.getElementById(textElementId);

        const container =
            document.getElementById(containerId);

        if (!textElement || !container) return;

        textElement.textContent = value;

        container
            .querySelectorAll(".dropdown-option")
            .forEach(option => {

                if (
                    option.textContent.trim() ===
                    String(value).trim()
                ) {

                    option.classList.add("selected");

                } else {

                    option.classList.remove("selected");

                }

            });

        container.classList.remove("is-open");

    };

    // ---------------- CLOSE DROPDOWN ----------------

    document.addEventListener("click", event => {

        if (
            !event.target.closest(
                ".custom-dropdown-container"
            )
        ) {

            document
                .querySelectorAll(".custom-dropdown-container")
                .forEach(el => {

                    el.classList.remove("is-open");

                });

        }

    });

    // ---------------- LOAD COURSE ----------------

    async function loadCourse() {

        try {

            const response = await fetch(
                `${API}/courses/${courseId}`,
                {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: "application/json"
                    }
                }
            );

            if (response.status === 401) {

                localStorage.clear();
                location.href = "login.html";

                return;
            }

            if (!response.ok) {

                throw new Error(
                    `Failed to load course. Status: ${response.status}`
                );

            }

            const course =
                await response.json();

            console.log(
                "Course loaded:",
                course
            );

            // NEW: keep the name for the delete pop-up
            loadedCourseName =
                course.course_name || "";

            // ---------------- COURSE NAME ----------------

            if (courseNameInput) {

                courseNameInput.value =
                    course.course_name || "";

            }

            // ---------------- COURSE DETAILS ----------------

            if (courseDetailsInput) {

                courseDetailsInput.value =
                    course.course_details || "";

            }

            // ---------------- COURSE LANGUAGE ----------------

            if (langText) {

                langText.textContent =
                    course.course_language ||
                    "Course Language";

                setSelectedOption(
                    "langDropdownContainer",
                    course.course_language
                );

            }

            // ---------------- COURSE PAID ----------------

            if (typeText) {

                const isPaid =
                    course.course_paid === true ||
                    course.course_paid === 1 ||
                    course.course_paid === "true" ||
                    course.course_paid === "1";

                typeText.textContent =
                    isPaid ? "Yes" : "No";

                setSelectedOption(
                    "typeDropdownContainer",
                    isPaid ? "Yes" : "No"
                );

            }

            // ---------------- COURSE PRICE ----------------

            if (coursePriceInput) {

                coursePriceInput.value =
                    course.course_price ?? "";

            }

        } catch (error) {

            console.error(
                "Course loading error:",
                error
            );

            showToast(
                "Failed to load course information.",
                "#b91c1c"
            );

        }

    }

    // ---------------- SELECTED OPTION STYLE ----------------

    function setSelectedOption(
        containerId,
        selectedValue
    ) {

        const container =
            document.getElementById(containerId);

        if (!container || !selectedValue) return;

        container
            .querySelectorAll(".dropdown-option")
            .forEach(option => {

                if (
                    option.textContent.trim() ===
                    String(selectedValue).trim()
                ) {

                    option.classList.add("selected");

                } else {

                    option.classList.remove("selected");

                }

            });

    }

    // ---------------- SUBMIT / UPDATE COURSE ----------------

    window.handleSubmit = async function (event) {

        event.preventDefault();

        // ---------------- COURSE NAME ----------------

        const courseName =
            courseNameInput?.value.trim();

        if (!courseName) {

            showToast(
                "Please enter course name.",
                "#b91c1c"
            );

            return;
        }

        // ---------------- COURSE DETAILS ----------------

        const courseDetails =
            courseDetailsInput?.value.trim() || "";

        // ---------------- LANGUAGE ----------------

        const courseLanguage =
            langText?.textContent.trim();

        if (
            !courseLanguage ||
            courseLanguage === "Course Language"
        ) {

            showToast(
                "Please select course language.",
                "#b91c1c"
            );

            return;
        }

        // ---------------- PAID / FREE ----------------

        const paidText =
            typeText?.textContent.trim();

        if (
            !paidText ||
            paidText === "Course Type"
        ) {

            showToast(
                "Please select course type.",
                "#b91c1c"
            );

            return;
        }

        const coursePaid =
            paidText === "Yes";

        // ---------------- PRICE ----------------

        const priceValue =
            coursePriceInput?.value.trim() || "";

        let coursePrice = null;

        if (coursePaid) {

            if (!priceValue) {

                showToast(
                    "Please enter course price.",
                    "#b91c1c"
                );

                return;
            }

            coursePrice =
                Number(priceValue);

            if (
                isNaN(coursePrice) ||
                coursePrice < 0
            ) {

                showToast(
                    "Please enter a valid course price.",
                    "#b91c1c"
                );

                return;
            }

        } else {

            coursePrice = 0;

        }

        // ---------------- UPDATE DATA ----------------

        const updateData = {

            course_name:
                courseName,

            course_details:
                courseDetails,

            course_language:
                courseLanguage,

            course_paid:
                coursePaid,

            course_price:
                coursePrice,

            course_price_currency:
                "INR"

        };

        console.log(
            "Updating teacher course:",
            courseId
        );

        console.log(
            "Update data:",
            updateData
        );

        try {

            // IMPORTANT:
            // Teacher-specific endpoint
            // NOT admin endpoint

            const response = await fetch(
                `${API}/teachers/me/courses/${courseId}`,
                {
                    method: "PATCH",
                    headers: headers(),
                    body: JSON.stringify(updateData)
                }
            );

            // ---------------- AUTH ERROR ----------------

            if (response.status === 401) {

                localStorage.clear();
                location.href = "login.html";

                return;
            }

            // ---------------- PERMISSION ERROR ----------------

            if (response.status === 403) {

                let message =
                    "You are not allowed to edit this course.";

                try {

                    const errorData =
                        await response.json();

                    if (errorData.detail) {

                        message =
                            typeof errorData.detail === "string"
                                ? errorData.detail
                                : JSON.stringify(
                                    errorData.detail
                                );

                    }

                } catch (error) {

                    console.error(
                        "403 error reading:",
                        error
                    );

                }

                showToast(
                    message,
                    "#b91c1c"
                );

                return;
            }

            // ---------------- NOT FOUND ----------------

            if (response.status === 404) {

                showToast(
                    "Course not found.",
                    "#b91c1c"
                );

                return;
            }

            // ---------------- VALIDATION / OTHER ERROR ----------------

            if (!response.ok) {

                let errorMessage =
                    "Failed to update course.";

                try {

                    const errorData =
                        await response.json();

                    if (errorData.detail) {

                        if (
                            typeof errorData.detail ===
                            "string"
                        ) {

                            errorMessage =
                                errorData.detail;

                        } else {

                            errorMessage =
                                JSON.stringify(
                                    errorData.detail
                                );

                        }

                    }

                } catch (error) {

                    console.error(
                        "Error reading API error:",
                        error
                    );

                }

                showToast(
                    errorMessage,
                    "#b91c1c"
                );

                return;
            }

            // ---------------- SUCCESS ----------------

            const updatedCourse =
                await response.json();

            console.log(
                "Course updated successfully:",
                updatedCourse
            );

            showToast(
                "Course updated successfully!",
                "#0f4c5c"
            );

            // Return to teacher dashboard
            // after successful update

            setTimeout(() => {

                location.href =
                    "teacher.html";

            }, 1200);

        } catch (error) {

            console.error(
                "Course update error:",
                error
            );

            showToast(
                "Something went wrong while updating course.",
                "#b91c1c"
            );

        }

    };

    // ---------------- CANCEL ----------------

    window.handleCancel = function () {

        const confirmed =
            confirm(
                "Are you sure you want to cancel?"
            );

        if (!confirmed) return;

        location.href =
            "teacher.html";

    };


    /* ==========================================================
       NEW: DELETE COURSE
       API: DELETE /teachers/me/courses/{id}
            -> 204 (success, no body)
            -> 422 (validation error)

       Flow:
       1. Teacher clicks the red "Delete course" button.
       2. A confirm pop-up opens (nothing is deleted yet).
       3. "Yes, delete" sends the DELETE request.
       4. On success we go back to the teacher dashboard.
       ========================================================== */

    /** Opens the confirm pop-up and writes the course name into it. */
    function openDeleteModal() {

        if (!deleteModal) return;

        // Show the real name; use a friendly fallback if it is not loaded yet
        dcCourseName.textContent =
            loadedCourseName
                ? `"${loadedCourseName}"`
                : "this course";

        deleteModal.classList.add("is-open");
        deleteModal.setAttribute("aria-hidden", "false");

    }

    /** Closes the pop-up (does nothing while a delete request is running). */
    function closeDeleteModal() {

        if (!deleteModal) return;

        // Do not let the teacher close it in the middle of the request
        if (dcConfirmBtn && dcConfirmBtn.disabled) return;

        deleteModal.classList.remove("is-open");
        deleteModal.setAttribute("aria-hidden", "true");

    }

    /**
     * Turns a failed API response into a readable message.
     * FastAPI sends { detail: "text" } or, for 422,
     * { detail: [ { msg: "text", ... } ] }.
     */
    async function readDeleteError(response) {

        let message =
            "Failed to delete course.";

        try {

            const errorData =
                await response.json();

            if (typeof errorData.detail === "string") {

                message = errorData.detail;

            } else if (
                Array.isArray(errorData.detail) &&
                errorData.detail[0] &&
                errorData.detail[0].msg
            ) {

                message = errorData.detail[0].msg;

            }

        } catch (error) {

            // The response had no JSON body: keep the default message
            console.error(
                "Error reading delete error:",
                error
            );

        }

        return message;

    }

    /** Sends the DELETE request. Called by the "Yes, delete" button. */
    async function deleteCourse() {

        // Disable both buttons so nobody clicks twice
        dcConfirmBtn.disabled = true;
        dcCancelBtn.disabled = true;
        dcConfirmBtn.textContent = "Deleting...";

        try {

            // Teacher-specific endpoint (same family as the PATCH above)
            const response = await fetch(
                `${API}/teachers/me/courses/${courseId}`,
                {
                    method: "DELETE",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: "application/json"
                    }
                }
            );

            // ---------------- AUTH ERROR ----------------

            if (response.status === 401) {

                localStorage.clear();
                location.href = "login.html";

                return;
            }

            // ---------------- NOT ALLOWED ----------------

            if (response.status === 403) {

                showToast(
                    "You are not allowed to delete this course.",
                    "#b91c1c"
                );

                return;
            }

            // ---------------- ALREADY GONE ----------------

            if (response.status === 404) {

                showToast(
                    "Course not found. It may already be deleted.",
                    "#b91c1c"
                );

                return;
            }

            // ---------------- OTHER ERRORS (422, 500 ...) ----------------

            if (!response.ok) {

                showToast(
                    await readDeleteError(response),
                    "#b91c1c"
                );

                return;
            }

            // ---------------- SUCCESS (204) ----------------

            // Forget the "selected course" so no page tries to open a deleted course
            if (localStorage.getItem("selected_course_id") === courseId) {

                localStorage.removeItem("selected_course_id");

            }

            // Re-enable first, otherwise closeDeleteModal() refuses to close
            dcConfirmBtn.disabled = false;
            dcCancelBtn.disabled = false;
            closeDeleteModal();

            showToast(
                "Course deleted successfully.",
                "#0f4c5c"
            );

            // Back to the teacher dashboard
            setTimeout(() => {

                location.href =
                    "teacher.html";

            }, 1200);

        } catch (error) {

            console.error(
                "Course delete error:",
                error
            );

            showToast(
                "Something went wrong while deleting the course.",
                "#b91c1c"
            );

        } finally {

            // Always give the buttons back (the page may stay open after an error)
            dcConfirmBtn.disabled = false;
            dcCancelBtn.disabled = false;
            dcConfirmBtn.textContent = "Yes, delete";

            // After an error, close the pop-up so the toast message is visible
            closeDeleteModal();

        }

    }

    // ---------------- DELETE: EVENTS ----------------

    if (deleteCourseBtn) {
        deleteCourseBtn.addEventListener("click", openDeleteModal);
    }

    if (dcCancelBtn) {
        dcCancelBtn.addEventListener("click", closeDeleteModal);
    }

    if (dcConfirmBtn) {
        dcConfirmBtn.addEventListener("click", deleteCourse);
    }

    // Clicking the dark area outside the white box closes the pop-up
    if (deleteModal) {

        deleteModal.addEventListener("click", event => {

            if (event.target === deleteModal) {
                closeDeleteModal();
            }

        });

    }

    // The Escape key closes the pop-up
    document.addEventListener("keydown", event => {

        if (event.key === "Escape") {
            closeDeleteModal();
        }

    });

    // ---------------- START ----------------

    loadCourse();

});