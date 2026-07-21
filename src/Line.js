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
    for (let i = 0; i < this.vertices.length; i += 2) {
      const x0 = this.vertices[i]
      const y0 = this.vertices[i + 1]
      const localX = this.offset.x + (x0 * this.cos - y0 * this.sin)
      const localY = this.offset.y + (x0 * this.sin + y0 * this.cos)

      this.worldVertices[i] = x + (localX * cos - localY * sin)
      this.worldVertices[i + 1] = y + (localX * sin + localY * cos)
    }

    this.updateAABB()

    const c0X = 0
    const c0Y = -this.length * 0.5
    const c1X = 0
    const c1Y = this.length * 0.5

    const local0X = this.offset.x + (c0X * this.cos - c0Y * this.sin)
    const local0Y = this.offset.y + (c0X * this.sin + c0Y * this.cos)
    const local1X = this.offset.x + (c1X * this.cos - c1Y * this.sin)
    const local1Y = this.offset.y + (c1X * this.sin + c1Y * this.cos)

    this.center1.x = x + (local0X * cos - local0Y * sin)
    this.center1.y = y + (local0X * sin + local0Y * cos)
    this.center2.x = x + (local1X * cos - local1Y * sin)
    this.center2.y = y + (local1X * sin + local1Y * cos)

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
