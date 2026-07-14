export default class Touch {
  #target = null
  #gestureIds = []
  #gestureCenter = { x: 0, y: 0 }
  #lastGestureCenter = { x: 0, y: 0 }
  #lastGestureDistance = 0
  #lastGestureRotation = 0

  #touchId = null
  #lastTouchX = 0
  #lastTouchY = 0

  constructor(target, option = {}) {
    this.#target = target
    this.onPan = null
    this.onZoom = null
    this.onRotate = null

    this.onDown = null
    this.onMove = null
    this.onUp = null

    this.#bindEvents()
  }

  #bindEvents() {
    const target = this.#target

    if (!target) {
      return
    }

    target.addEventListener(
      "touchstart",
      e => {
        e.preventDefault()
        this.#beginGestureFromTouches(e.touches)
      },
      { passive: false }
    )

    target.addEventListener(
      "touchmove",
      e => {
        e.preventDefault()

        if (this.#touchId !== null) {
          const touch = this.#findTouch(e.touches, this.#touchId)

          if (touch) {
            const dx = touch.clientX - this.#lastTouchX
            const dy = touch.clientY - this.#lastTouchY

            if (typeof this.onMove == "function") {
              this.onMove(dx, dy, touch.clientX, touch.clientY)
            }
          }

          this.#lastTouchX = touch.clientX
          this.#lastTouchY = touch.clientY
        }

        // pan + zoom + rotate
        if (this.#gestureIds[0] !== null && this.#gestureIds[1] !== null) {
          const a = this.#findTouch(e.touches, this.#gestureIds[0])
          const b = this.#findTouch(e.touches, this.#gestureIds[1])

          if (a && b) {
            const center = this.#getCenter(a, b, this.#gestureCenter)
            const distance = this.#getDistance(a, b)
            const rotation = this.#getRotation(a, b)

            if (typeof this.onPan == "function") {
              const dx = center.x - this.#lastGestureCenter.x
              const dy = center.y - this.#lastGestureCenter.y

              this.onPan(dx, dy)
            }

            if (typeof this.onZoom == "function") {
              this.onZoom(distance / this.#lastGestureDistance)
            }

            if (typeof this.onRotate == "function") {
              this.onRotate(rotation - this.#lastGestureRotation)
            }

            this.#lastGestureCenter.x = center.x
            this.#lastGestureCenter.y = center.y
            this.#lastGestureDistance = distance
            this.#lastGestureRotation = rotation
          }
        }
      },
      { passive: false }
    )

    target.addEventListener("touchend", e =>
      this.#beginGestureFromTouches(e.touches)
    )
    target.addEventListener("touchcancel", e =>
      this.#beginGestureFromTouches(e.touches)
    )
  }

  #findTouch(touches, id) {
    for (let i = 0; i < touches.length; i++) {
      if (touches[i].identifier === id) return touches[i]
    }
    return null
  }

  #getCenter(a, b, out = {}) {
    out.x = (a.clientX + b.clientX) * 0.5
    out.y = (a.clientY + b.clientY) * 0.5
    return out
  }

  #getDistance(a, b) {
    const dx = a.clientX - b.clientX
    const dy = a.clientY - b.clientY
    return Math.sqrt(dx * dx + dy * dy)
  }

  #getRotation(a, b) {
    return Math.atan2(b.clientY - a.clientY, b.clientX - a.clientX)
  }

  #beginGestureFromTouches(touches) {
    this.#gestureIds[0] = null
    this.#gestureIds[1] = null
    this.#lastGestureCenter.x = 0
    this.#lastGestureCenter.y = 0
    this.#lastGestureDistance = 0
    this.#lastGestureRotation = 0

    this.#touchId = null
    this.#lastTouchX = 0
    this.#lastTouchY = 0

    if (touches.length == 1) {
      this.#touchId = touches[0].identifier
      this.#lastTouchX = touches[0].clientX
      this.#lastTouchY = touches[0].clientY

      if (typeof this.onDown == "function") {
        this.onDown(touches[0].clientX, touches[0].clientY)
      }
    } else if (touches.length >= 2) {
      this.#gestureIds[0] = touches[0].identifier
      this.#gestureIds[1] = touches[1].identifier
      this.#getCenter(touches[0], touches[1], this.#lastGestureCenter)
      this.#lastGestureDistance = this.#getDistance(touches[0], touches[1])
      this.#lastGestureRotation = this.#getRotation(touches[0], touches[1])
    } else {
      if (typeof this.onUp == "function") {
        this.onUp()
      }
    }
  }
}
