const P1_BUTTON = document.getElementById("player1")
const P2_BUTTON = document.getElementById("player2")
const TICK = new Audio("tick.ogg")
const LOW = new Audio("low.ogg")
const END = new Audio("end.ogg")

let isActive = true
let isFlipped = false

document.getElementById("restart").onclick = function () {
    socket.emit("save")
}
document.getElementById("pause").onclick = function () {
    socket.emit("pause")
}

P1_BUTTON.onclick = function () {
    if (isActive) {
        socket.emit("played", 1)
    }
}
P2_BUTTON.onclick = function () {
    if (isActive) {
        socket.emit("played", 2)
    }
}

// Check if the browser supports service workers
if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
        navigator.serviceWorker.register("/service-worker.js")
            .then(function (registration) {
                // Registration was successful
                console.log("ServiceWorker registration successful with scope: ", registration.scope)
            })
            .catch(function (err) {
                // Registration failed
                console.log("ServiceWorker registration failed: ", err)
            })
    })
}

const socket = io()

function updateTimeDisplay(playerButton, clock) {
    playerButton.innerText = clock
    playerButton.style.fontSize = clock.length > 5 ? '13vh' : '15vh'
}

socket.emit("start")

socket.on("start", (clock) => {
    isActive = true

    P1_BUTTON.classList.remove("low", "lost")
    P1_BUTTON.disabled = false
    updateTimeDisplay(P1_BUTTON, clock)

    P2_BUTTON.classList.remove("low", "lost")
    P2_BUTTON.disabled = false
    updateTimeDisplay(P2_BUTTON, clock)

    document.getElementById("pauseIcon").style.visibility = "visible"
    document.getElementById("pauseIcon").innerText = "pause"
})

socket.on("reentered", (state) => {
    if (state.isPaused) {
        pause()
    }

    P1_BUTTON.disabled = state.inactivePlayer === 1
    P2_BUTTON.disabled = state.inactivePlayer === 2

    updateTimeDisplay(P1_BUTTON, state.player1Time)
    updateTimeDisplay(P2_BUTTON, state.player2Time)

    if (state.isPlayer1Lost) {
        document.getElementById("pauseIcon").style.visibility = "hidden"
        P1_BUTTON.classList.add("lost")
        P1_BUTTON.disabled = true
    } else if (state.isPlayer1Low) {
        P1_BUTTON.classList.add("low")
    }

    if (state.isPlayer2Lost) {
        document.getElementById("pauseIcon").style.visibility = "hidden"
        P2_BUTTON.classList.add("lost")
        P2_BUTTON.disabled = true
    } else if (state.isPlayer2Low) {
        P2_BUTTON.classList.add("low")
    }
})

document.getElementById("flip").addEventListener("click", function () {
    const columnDiv = document.querySelector(".column")

    if (isFlipped) {
        columnDiv.prepend(P1_BUTTON)
        columnDiv.appendChild(P2_BUTTON)

        isFlipped = false
    } else if (!isFlipped) {
        columnDiv.prepend(P2_BUTTON)
        columnDiv.appendChild(P1_BUTTON)

        isFlipped = true
    }
})

socket.on("status", () => {
    socket.emit("status", isActive)
})

socket.on("active", (active) => {
    isActive = active
})

socket.on("played", (inactivePlayer) => {
    P1_BUTTON.disabled = inactivePlayer === 1
    P2_BUTTON.disabled = inactivePlayer === 2

    TICK.play()
})

socket.on("pause", () => {
    pause()
})

function pause() {
    P1_BUTTON.disabled = true
    P2_BUTTON.disabled = true

    document.getElementById("pauseIcon").innerText = "play_arrow"
}

socket.on("unpause", (isInitialState) => {
    if (isInitialState) {
        P1_BUTTON.disabled = false
        P2_BUTTON.disabled = false
    }

    document.getElementById("pauseIcon").innerText = "pause"
})

socket.on("update", (player, clock) => {
    const currentPlayerButton = player === 1 ? P1_BUTTON : P2_BUTTON

    updateTimeDisplay(currentPlayerButton, clock)
})

socket.on("recovered", (inactivePlayer) => {
    const recoveredPlayerButton = inactivePlayer === 1 ? P1_BUTTON : P2_BUTTON

    recoveredPlayerButton.classList.remove("low")
})

socket.on("low", (activePlayer) => {
    const currentPlayerButton = activePlayer === 1 ? P1_BUTTON : P2_BUTTON

    if (isActive) {
        LOW.play()
    }

    currentPlayerButton.classList.add("low")
})

socket.on("lost", (activePlayer) => {
    const currentPlayerButton = activePlayer === 1 ? P1_BUTTON : P2_BUTTON

    END.play()
    document.getElementById("pauseIcon").style.visibility = "hidden"
    currentPlayerButton.classList.add("lost")
    currentPlayerButton.disabled = true
})