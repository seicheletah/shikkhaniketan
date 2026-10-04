
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

    // ---------------- START ----------------

    loadCourse();

});