document.getElementById("minutes").value = 15
document.getElementById("increment").value = 10

document.getElementById("minutes").addEventListener("input", () => {
    updateSaveButtonState()
})

document.getElementById("increment").addEventListener("input", () => {
    updateSaveButtonState()
})

function updateSaveButtonState() {
    const minutes = document.getElementById("minutes").value.toString()
    const increment = document.getElementById("increment").value.toString()

    // Validate input values
    const isValidMinutes = /^[0-9]+$/.test(minutes) && minutes >= 1 && minutes <= 180
    const isValidIncrement = /^[0-9]+$/.test(increment) && increment >= 0 && increment <= 180

    // Enable/disable submit button based on validity of both inputs
    document.getElementById("save").disabled = !(isValidMinutes && isValidIncrement)
}

document.getElementById("save").onclick = function () {
    settingsMenu.style.display = "none"

    const minutes = document.getElementById("minutes").value.toString()
    const increment = document.getElementById("increment").value.toString()

    socket.emit("save", minutes, increment)
}

const settings = document.getElementById("settings")
const settingsMenu = document.getElementById("settings-menu")

// When the user clicks on the button, open the modal
settings.onclick = function () {
    settingsMenu.style.display = "block"
}

// When the user clicks anywhere outside the modal, close it
window.onclick = function (event) {
    if (event.target === settingsMenu) {
        settingsMenu.style.display = "none"
    }
}