import express from "express"
import {createServer} from "node:http"
import {fileURLToPath} from "node:url"
import {dirname, join} from "node:path"
import {Server} from "socket.io"
import {clearInterval, setInterval} from "timers"

const app = express()
const server = createServer(app)
const io = new Server(server, {
    connectionStateRecovery: {}
})
const __dirname = dirname(fileURLToPath(import.meta.url))
app.use(express.static(join(__dirname, "public")))

const players = {
    1: {
        time: 15 * 60000, isLow: false
    }, 2: {
        time: 15 * 60000, isLow: false
    }
}

let minutes = 15
let increment = 10
let interval
let isInitialState = true
let active
let isPaused = false
let lastTime
let connectedClients = 0

io.on("connection", (socket) => {
    if (connectedClients < 2) {
        connectedClients++
    } else {
        socket.disconnect(true)
    }

    socket.on("disconnect", () => {
        connectedClients--
    })

    socket.on("start", () => {
        if (isInitialState) {
            isPaused = false

            const clock = millisecondsToMinutes(players[1].time)

            socket.emit("start", clock)
        } else {
            socket.broadcast.emit("status")

            const state = {
                inactivePlayer: active === 1 ? 2 : 1,
                player1Time: millisecondsToMinutes(players[1].time + 900),
                player2Time: millisecondsToMinutes(players[2].time + 900),
                isPlayer1Low: players[1].isLow,
                isPlayer2Low: players[2].isLow,
                isPlayer1Lost: players[1].time <= 0,
                isPlayer2Lost: players[2].time <= 0,
                isPaused: isPaused
            }

            socket.emit("reentered", state)

            if (isPaused) {
                socket.emit("pause")
            }
        }
    })

    socket.on("save", (newMinutes = minutes, newIncrement = increment) => {
        clearInterval(interval)
        isInitialState = true

        minutes = newMinutes
        increment = newIncrement

        players[1].time = newMinutes * 60000
        players[2].time = newMinutes * 60000

        players[1].isLow = false
        players[2].isLow = false

        const clock = millisecondsToMinutes(players[1].time)
        io.emit("start", clock)
    })

    socket.on("status", (isActive) => {
        socket.broadcast.emit("active", !isActive)
    })

    socket.on("played", (inactivePlayer) => {
        io.emit("played", inactivePlayer)
        socket.emit("active", false)
        socket.broadcast.emit("active", true)
        active = inactivePlayer === 1 ? 2 : 1

        if (isInitialState) {
            lastTime = Date.now()
            isInitialState = false
        } else {
            players[inactivePlayer].time += increment * 1000
            const clock = millisecondsToMinutes(players[inactivePlayer].time + 900)

            io.emit("update", inactivePlayer, clock)
        }

        clearInterval(interval)
        interval = setInterval(() => {
            time()
        }, 10)
    })

    socket.on("pause", () => {
        if (!isPaused) {
            clearInterval(interval)

            isPaused = true

            io.emit("pause")
        } else {
            isPaused = false
            let inactivePlayer = active === 1 ? 2 : 1

            if (!isInitialState) {
                io.emit("played", inactivePlayer)

                clearInterval(interval)
                lastTime = Date.now()
                interval = setInterval(() => {
                    time()
                }, 10)
            }

            io.emit("unpause", isInitialState)
        }
    })

    function time() {
        const currentTime = Date.now()
        const deltaTime = currentTime - lastTime
        lastTime = currentTime

        const activePlayer = players[active]
        const inactivePlayer = players[active === 1 ? 2 : 1]

        activePlayer.time -= deltaTime

        if (activePlayer.time % 1000 < 25 || activePlayer.time % 1000 > 975) {
            const clock = millisecondsToMinutes(activePlayer.time)

            io.emit("update", active, clock)
        }

        if (inactivePlayer.isLow && inactivePlayer.time > 119100) {
            inactivePlayer.isLow = false

            io.emit("recovered", active === 1 ? 2 : 1)
        } else if (!activePlayer.isLow && activePlayer.time <= 59000) {
            activePlayer.isLow = true

            io.emit("low", active)
        } else if (activePlayer.time <= 0) {
            io.emit("lost", active)

            clearInterval(interval)
        }
    }
})

function millisecondsToMinutes(millis) {
    let milliseconds = millis + 50
    let seconds = Math.floor(milliseconds / 1000)
    let hours = Math.floor(seconds / 3600)
    seconds -= hours * 3600
    let minutes = Math.floor(seconds / 60)
    seconds -= minutes * 60

    seconds = String(seconds).padStart(2, "0")
    if (hours > 0) {
        minutes = String(minutes).padStart(2, "0")

        return hours + ":" + minutes + ":" + seconds
    } else {
        return minutes + ":" + seconds
    }
}

server.listen(3000, () => {
    console.log("server running at http://localhost:3000")
})