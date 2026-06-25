import Vector from "./Vector.js"
import AABB from "./AABB.js"
import Vertices from "./Vertices.js"

export default class Capsule {
  #rot
  static #uid = 0
  constructor(length, radius, options = {}) {
    this.id = Capsule.#uid++
    this.type = "capsule"
    this.center = new Vector()
    this.vertices = new Float32Array([0, -length * 0.5, 0, length * 0.5])
    this.worldVertices = new Float32Array(4)
    this.radius = radius
    this.offset = options.offset ?? new Vector()
    this.#rot = options.rotation ?? 0
    this.cos = Math.cos(this.#rot)
    this.sin = Math.sin(this.#rot)

    this.density = options.density ?? 1
    this.thickness = options.thickness ?? 1
    this.area = length * (2 * radius) + Math.PI * radius * radius
    this.mass = this.density * this.area * this.thickness
    this.inertia = (this.mass * (length * length + 4 * radius * radius)) / 12

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
    for (let i = 0; i < this.vertices.length; i += 2) {
      const x0 = this.offset.x + this.vertices[i]
      const y0 = this.offset.y + this.vertices[i + 1]
      const x1 = x0 * this.cos - y0 * this.sin
      const y1 = x0 * this.sin + y0 * this.cos

      this.worldVertices[i] = x + (x1 * cos - y1 * sin)
      this.worldVertices[i + 1] = y + (x1 * sin + y1 * cos)
    }

    Vertices.getMean(this.worldVertices, this.center)
    this.updateAABB()
  }

  updateAABB() {
    this.aabb.set(Infinity, Infinity, -Infinity, -Infinity)

    for (let i = 0; i < this.worldVertices.length; i += 2) {
      const x0 = this.worldVertices[i]
      const y0 = this.worldVertices[i + 1]

      if (x0 < this.aabb.minX) this.aabb.minX = x0
      if (y0 < this.aabb.minY) this.aabb.minY = y0
      if (x0 > this.aabb.maxX) this.aabb.maxX = x0
      if (y0 > this.aabb.maxY) this.aabb.maxY = y0
    }

    return this.aabb
  }
}
