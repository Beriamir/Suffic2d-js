import Vector from "./Vector.js"
import AABB from "./AABB.js"

export default class Circle {
  #rot
  static #uid = 0
  constructor(radius, options = {}) {
    this.id = Circle.#uid++
    this.type = "circle"
    this.radius = radius // local
    this.offset = options.offset ?? new Vector()
    this.#rot = options.rotation ?? 0
    this.cos = Math.cos(this.#rot)
    this.sin = Math.sin(this.#rot)

    this.density = options.density ?? 1
    this.thickness = options.thickness ?? 1
    this.area = Math.PI * radius * radius
    this.mass = this.density * this.area * this.thickness
    this.inertia = 0.5 * this.mass * this.radius * this.radius

    const hue = Math.random() * 360
    this.fillColor = options.fillColor ?? `hsl(${hue}, 50%, 40%)`
    this.strokeColor = options.strokeColor ?? `hsl(${hue}, 50%, 60%)`

    this.aabb = new AABB()
  }
  set rotation(value) {
    this.#rot = value
    this.cos = Math.cos(this.#rot)
    this.sin = Math.sin(this.#rot)
  }
  get rotation() {
    return this.#rot
  }

  updateWorldVertices(x, y, cos, sin) {
    this.updateAABB(x, y)
  }

  updateAABB(x, y) {
    this.aabb.minX = x - this.radius
    this.aabb.minY = y - this.radius
    this.aabb.maxX = x + this.radius
    this.aabb.maxY = y + this.radius
    return this.aabb
  }
}
