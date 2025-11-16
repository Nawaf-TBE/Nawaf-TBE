// Basic User Interface setup

// Function to initialize the UI
function initializeUI() {
    console.log("Initializing User Interface...");
    // Example: Create a basic button
    const button = document.createElement("button");
    button.textContent = "Click Me";
    button.addEventListener("click", () => {
        alert("Button clicked!");
    });

    // Append the button to the body
    document.body.appendChild(button);
}

// Call the initializeUI function when the DOM is fully loaded
document.addEventListener("DOMContentLoaded", initializeUI);