import Vector from "./Vector.js"
import AABB from "./AABB.js"

export default class Circle {
  #rot
  constructor(radius, options = {}) {
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
    const localX = this.offset.x
    const localY = this.offset.y

    this.center.x = x + (localX * cos - localY * sin)
    this.center.y = y + (localX * sin + localY * cos)
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
