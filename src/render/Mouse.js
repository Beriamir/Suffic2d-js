export default class Mouse {
  #buttons = new Set()
  #lastX = 0
  #lastY = 0

  static LEFT = 0
  static MIDDLE = 1
  static RIGHT = 2

  constructor(input) {
    input.target.addEventListener("mousedown", event => {
      event.preventDefault()
      this.#buttons.add(event.button)
      this.#lastX = event.clientX
      this.#lastY = event.clientY

      if (typeof input.onDown == "function") {
        input.onDown(event.clientX, event.clientY)
      }
    })

    input.target.addEventListener("mousemove", event => {
      event.preventDefault()
      const dx = event.clientX - this.#lastX
      const dy = event.clientY - this.#lastY

      if (typeof input.onMove == "function") {
        input.onMove(dx, dy, event.clientX, event.clientY)
      }

      if (input.keyboard.isDown("Space") && this.isDown(Mouse.LEFT)) {
        if (typeof input.onPan == "function") {
          input.onPan(dx, dy)
        }
      }

      if (this.isDown(Mouse.MIDDLE)) {
        if (typeof input.onPan == "function") {
          input.onPan(dx, dy)
        }
      }

      this.#lastX = event.clientX
      this.#lastY = event.clientY
    })

    input.target.addEventListener("mouseup", event => {
      event.preventDefault()
      this.#buttons.delete(event.button)
      this.#lastX = 0
      this.#lastY = 0

      if (typeof input.onUp == "function") {
        input.onUp()
      }
    })

    input.target.addEventListener(
      "wheel",
      event => {
        event.preventDefault()

        if (input.keyboard.isDown("KeyR")) {
          if (typeof input.onRotate == "function") {
            input.onRotate(Math.atan2(event.deltaY, event.deltaX) * 0.1)
            return
          }
        }

        if (typeof input.onZoom == "function") {
          input.onZoom(1 - event.deltaY * 0.001)
        }
      },
      { passive: false }
    )
  }

  isDown(button) {
    return this.#buttons.has(button)
  }
}
