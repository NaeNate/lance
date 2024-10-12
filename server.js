import { spawn } from "child_process"
import express from "express"
import { createServer } from "http"
import { Server } from "socket.io"

const app = express()
const server = createServer(app)
const io = new Server(server)

app.use(express.static("public"))

let sides = { white: null, black: null }

io.on("connection", (socket) => {
  socket.on("start", ({ white, black }) => {
    if (white) {
      sides.white = spawn(white)

      sides.white.stdout.on("data", (data) => {
        io.emit("engine", { side: "white", data: data.toString() })
      })
    }

    if (black) {
      sides.black = spawn(black)

      sides.black.stdout.on("data", (data) => {
        io.emit("engine", { side: "black", data: data.toString() })
      })
    }
  })

  socket.on("client", ({ side, command }) => {
    const engine = sides[side]

    if (engine) {
      engine.stdin.write(command + "\n")
    }
  })

  socket.on("stop", () => {
    if (sides.white) sides.white.kill()
    if (sides.black) sides.black.kill()

    sides = { white: null, black: null }
  })
})

server.listen(3000)
