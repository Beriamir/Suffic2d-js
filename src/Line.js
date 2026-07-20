import Vector from "./Vector.js"
import AABB from "./AABB.js"
import Vertices from "./Vertices.js"

export default class Line {
  #rot
  constructor(length, options = {}) {
    this.type = "line"
    this.length = length
    this.radius = 0
    this.vertices = new Float32Array([0, length * 0.5, 0, -length * 0.5])
    this.worldVertices = new Float32Array(this.vertices.length)
    this.center = new Vector()
    this.center1 = new Vector()
    this.center2 = new Vector()

    this.offset = options.offset ?? new Vector()
    this.#rot = options.rotation ?? 0
    this.cos = Math.cos(this.#rot)
    this.sin = Math.sin(this.#rot)

    this.density = options.density ?? 1
    this.thickness = options.thickness ?? 1
    this.area = this.length
    this.mass = this.density * this.area * this.thickness
    this.inertia = 0.0833333333 * this.mass * this.length ** 2

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
    const totalCos = cos * this.cos - sin * this.sin
    const totalSin = cos * this.sin + sin * this.cos

    for (let i = 0; i < this.vertices.length; i += 2) {
      const x0 = this.offset.x + this.vertices[i]
      const y0 = this.offset.y + this.vertices[i + 1]

      this.worldVertices[i] = x + (x0 * totalCos - y0 * totalSin)
      this.worldVertices[i + 1] = y + (x0 * totalSin + y0 * totalCos)
    }

    this.updateAABB()

    const x0 = this.offset.x + this.vertices[0]
    const y0 = this.offset.y + this.vertices[1]
    const x1 = this.offset.x + this.vertices[2]
    const y1 = this.offset.y + this.vertices[3]

    this.center1.x = x + (x0 * totalCos - y0 * totalSin)
    this.center1.y = y + (x0 * totalSin + y0 * totalCos)
    this.center2.x = x + (x1 * totalCos - y1 * totalSin)
    this.center2.y = y + (x1 * totalSin + y1 * totalCos)

    this.center.x = (this.center1.x + this.center2.x) * 0.5
    this.center.y = (this.center1.y + this.center2.y) * 0.5
  }

  updateAABB() {
    this.aabb.set(Infinity, Infinity, -Infinity, -Infinity)

    for (let i = 0; i < this.worldVertices.length; i += 2) {
      const x0 = this.worldVertices[i]
      const y0 = this.worldVertices[i + 1]

      if (x0 < this.aabb.minX) this.aabb.minX = x0
      if (x0 > this.aabb.maxX) this.aabb.maxX = x0

      if (y0 < this.aabb.minY) this.aabb.minY = y0
      if (y0 > this.aabb.maxY) this.aabb.maxY = y0
    }

    return this.aabb
  }
}
