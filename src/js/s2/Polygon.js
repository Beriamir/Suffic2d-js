import Vector from "./Vector.js"
import Vertices from "./Vertices.js"
import AABB from "./AABB.js"

export default class Polygon {
  static #uid = 0
  constructor(vertices, options = {}) {
    this.id = Polygon.#uid++
    this.type = "polygon"
    this.vertices = vertices // local
    this.worldVertices = new Float32Array(vertices)
    this.offset = options.offset ?? new Vector()
    this.rotation = options.rotation ?? 0
    this.cos = Math.cos(this.rotation)
    this.sin = Math.sin(this.rotation)

    for (let i = 0; i < this.vertices.length; i += 2) {
      const x0 = this.vertices[i]
      const y0 = this.vertices[i + 1]

      this.vertices[i] = x0 * this.cos - y0 * this.sin
      this.vertices[i + 1] = x0 * this.sin + y0 * this.cos
    }

    this.density = options.density ?? 1
    this.thickness = options.thickness ?? 1
    this.area = Vertices.getArea(vertices)
    this.mass = this.density * this.area * this.thickness
    this.inertia = Vertices.getInertia(vertices, this.mass)

    const hue = Math.random() * 360
    this.fillColor = options.fillColor ?? `hsl(${hue}, 50%, 40%)`
    this.strokeColor = options.strokeColor ?? `hsl(${hue}, 50%, 60%)`

    this.aabb = new AABB()
  }
  updateWorldVertices(x, y, cos, sin) {
    for (let i = 0; i < this.vertices.length; i += 2) {
      const x0 = this.offset.x + this.vertices[i]
      const y0 = this.offset.y + this.vertices[i + 1]

      this.worldVertices[i] = x + (x0 * cos - y0 * sin)
      this.worldVertices[i + 1] = y + (x0 * sin + y0 * cos)
    }

    return this.worldVertices
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
  rotate(angle) {
    this.rotation += angle
    this.cos = Math.cos(this.rotation)
    this.sin = Math.sin(this.rotation)

    for (let i = 0; i < this.vertices.length; i += 2) {
      const x0 = this.vertices[i]
      const y0 = this.vertices[i + 1]

      this.vertices[i] = x0 * this.cos - y0 * this.sin
      this.vertices[i + 1] = x0 * this.sin + y0 * this.cos
    }
  }
  translate(vector, s = 1) {
    this.offset.addMulV(vector, s)
  }
}
