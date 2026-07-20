export default class Keyboard {
  #keys = new Set()

  constructor(input) {
    window.addEventListener('keydown', (event) => {
      event.preventDefault()
      this.#keys.add(event.code)

      if (this.isDown('ArrowUp') || this.isDown('KeyW')) {
        if (typeof input.onPan == 'function') {
          input.onPan(0, 10)
        }
      } else if (this.isDown('ArrowDown') || this.isDown('KeyS')) {
        if (typeof input.onPan == 'function') {
          input.onPan(0, -10)
        }
      }

      if (this.isDown('ArrowLeft') || this.isDown('KeyA')) {
        if (typeof input.onPan == 'function') {
          input.onPan(10, 0)
        }
      } else if (this.isDown('ArrowRight') || this.isDown('KeyD')) {
        if (typeof input.onPan == 'function') {
          input.onPan(-10, 0)
        }
      }

      if (
        (this.isDown('ControlLeft') || this.isDown('ControlRight')) &&
        this.isDown('Equal')
      ) {
        if (typeof input.onZoom == 'function') {
          input.onZoom(1 + 0.1)
        }
      } else if (
        (this.isDown('ControlLeft') || this.isDown('ControlRight')) &&
        this.isDown('Minus')
      ) {
        if (typeof input.onZoom == 'function') {
          input.onZoom(1 - 0.1)
        }
      }
    })

    window.addEventListener('keyup', (event) => {
      this.#keys.delete(event.code)
    })
  }

  isDown(code = '') {
    return this.#keys.has(code)
  }
}
