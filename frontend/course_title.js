function determineLevel() {

    let feedback = document.getElementById("feedback").value.toLowerCase();

    let result = document.getElementById("startingPoint");

    if (feedback === "") {
        result.innerHTML = "Please provide your feedback.";
        return;
    }

    if (
        feedback.includes("beginner") ||
        feedback.includes("new") ||
        feedback.includes("don't know") ||
        feedback.includes("basic")
    ) {
        result.innerHTML = "Starting Point: Beginner Level";
    }

    else if (
        feedback.includes("intermediate") ||
        feedback.includes("some knowledge") ||
        feedback.includes("already know")
    ) {
        result.innerHTML = "Starting Point: Intermediate Level";
    }

    else if (
        feedback.includes("advanced") ||
        feedback.includes("expert") ||
        feedback.includes("experienced")
    ) {
        result.innerHTML = "Starting Point: Advanced Level";
    }

    else {
        result.innerHTML = "Starting Point: Basic Assessment Required";
    }
}