import Touch from './Touch.js'
import Mouse from './Mouse.js'
import Keyboard from './Keyboard.js'

export default class Input {
  constructor(target = window) {
    this.target = target

    this.mouse = new Mouse(this)
    this.touch = new Touch(this)
    this.keyboard = new Keyboard(this)

    this.onDown = null
    this.onMove = null
    this.onUp = null

    this.onPan = null
    this.onZoom = null
    this.onRotate = null
  }
}
