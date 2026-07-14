import Vector from "./Vector.js"
import AABB from "./AABB.js"

export default class Circle {
  #rot
  static #uid = 0
  constructor(radius, options = {}) {
    this.id = Circle.#uid++
    this.type = "circle"
    this.radius = radius
    this.center = new Vector()
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
    const x0 = this.offset.x
    const y0 = this.offset.y
    const x1 = x0 * this.cos - y0 * this.sin
    const y1 = x0 * this.sin + y0 * this.cos

    this.center.x = x + (x1 * cos - y1 * sin)
    this.center.y = y + (x1 * sin + y1 * cos)

    this.updateAABB()
  }

  updateAABB() {
    this.aabb.minX = this.center.x - this.radius
    this.aabb.minY = this.center.y - this.radius
    this.aabb.maxX = this.center.x + this.radius
    this.aabb.maxY = this.center.y + this.radius
    return this.aabb
  }
}
