const socket = io()

for (let i = 0; i < 8; i++) {
  for (let j = 0; j < 8; j++) {
    const square = document.createElement("div")

    square.classList.add("square")
    square.classList.add((i + j) % 2 === 0 ? "dark" : "light")
    square.dataset.name = ["a", "b", "c", "d", "e", "f", "g", "h"][j] + (8 - i)

    document.querySelector("#board").append(square)
  }
}

const pieces = {
  P: "♙",
  N: "♘",
  B: "♗",
  R: "♖",
  Q: "♕",
  K: "♔",
  p: "♟",
  n: "♞",
  b: "♝",
  r: "♜",
  q: "♛",
  k: "♚",
}

document.querySelector("#start").addEventListener("click", () => {
  const white = document.querySelector("#white").value
  const black = document.querySelector("#black").value

  socket.emit("start", { white, black })
  socket.emit("client", { side: "white", command: "uci" })
  socket.emit("client", { side: "black", command: "uci" })

  const fen =
    document.querySelector("#fen").value ||
    "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR"

  fen.split("/").forEach((row, rowIndex) => {
    let colIndex = 0

    for (const char of row) {
      if (isNaN(char)) {
        const piece = document.createElement("div")

        piece.textContent = pieces[char]
        piece.classList.add("piece")
        piece.draggable = true

        board.children[rowIndex * 8 + colIndex].appendChild(piece)

        colIndex++
      } else colIndex += parseInt(char)
    }
  })
})

document.querySelector("#stop").addEventListener("click", () => {
  socket.emit("stop")
  document.querySelectorAll(".piece").forEach((piece) => piece.remove())
})

const moves = []

let last = Date.now()

const handle = ({ side, data }) => {
  console.log(
    `%c${side}\n%c${data.trim()}%c\n\nTime:%c${(Date.now() - last) / 1000}`,
    "color: aquamarine;",
    "",
    "color: aquamarine;"
  )
  last = Date.now()

  for (const line of data.split("\n")) {
    const parts = line.split(" ")

    if (parts[0] === "uciok") {
      socket.emit("client", { side, command: "isready" })
    } else if (parts[0] === "readyok") {
      if (side === "white") {
        socket.emit("client", { side, command: "position startpos\ngo" })
      }
    } else if (parts[0] === "bestmove") {
      const move = parts[1]

      const squareToIndex = (square) => {
        const file = square[0].charCodeAt(0) - "a".charCodeAt(0)
        const rank = 8 - parseInt(square[1])

        return rank * 8 + file
      }

      const board = document.querySelector("#board")
      const piece = board.children[squareToIndex(move.slice(0, 2))].children[0]

      const promotion = move.slice(4, 5)
      if (promotion) piece.textContent = pieces[promotion]

      const castlingInfo = {
        e1g1: { from: "h1", to: "f1" },
        e1c1: { from: "a1", to: "d1" },
        e8g8: { from: "h8", to: "f8" },
        e8c8: { from: "a8", to: "d8" },
      }

      if (piece.textContent === "♔" || piece.textContent === "♚") {
        const info = castlingInfo[move]

        if (info) {
          const rook = board.children[squareToIndex(info.from)].children[0]

          board.children[squareToIndex(info.from)].removeChild(rook)
          board.children[squareToIndex(info.to)].replaceChildren(rook)
        }
      }

      board.children[squareToIndex(move.slice(0, 2))].removeChild(piece)
      board.children[squareToIndex(move.slice(2, 4))].replaceChildren(piece)

      moves.push(move.toLowerCase())

      socket.emit("client", {
        side: side === "white" ? "black" : "white",
        command: "position startpos moves " + moves.join(" ") + "\ngo",
      })
    }
  }
}

socket.on("engine", handle)

document.addEventListener("dragstart", (e) => (draggedPiece = e.target))
document.addEventListener("dragover", (e) => e.preventDefault())

let draggedPiece = null

document.addEventListener("drop", (e) => {
  let targetSquare = e.target

  if (e.target.classList.contains("piece")) {
    targetSquare = e.target.parentElement
  }

  if (targetSquare === draggedPiece.parentElement) {
    return
  }

  let promotion = ""

  if (
    draggedPiece.textContent === "♙" &&
    targetSquare.dataset.name.slice(1, 2) === "8"
  ) {
    promotion = "Q"
  }

  if (
    draggedPiece.textContent === "♟" &&
    targetSquare.dataset.name.slice(1, 2) === "1"
  ) {
    promotion = "q"
  }

  if (targetSquare.classList.contains("square")) {
    handle({
      side: moves.length % 2 === 0 ? "white" : "black",
      data:
        "bestmove " +
        draggedPiece.parentElement.dataset.name +
        targetSquare.dataset.name +
        promotion,
    })
  }
})
