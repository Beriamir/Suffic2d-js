import Vector from "./Vector.js"
import Vertices from "./Vertices.js"
import AABB from "./AABB.js"

export default class Polygon {
  #rot
  constructor(vertices, options = {}) {
    this.type = "polygon"
    this.vertices = vertices
    this.worldVertices = new Float32Array(vertices.length)
    this.center = new Vector()

    this.offset = options.offset ?? new Vector()
    this.#rot = options.rotation ?? 0
    this.cos = Math.cos(this.#rot)
    this.sin = Math.sin(this.#rot)

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

  set rotation(value) {
    this.#rot = value
    this.cos = Math.cos(this.#rot)
    this.sin = Math.sin(this.#rot)
  }
  get rotation() {
    return this.#rot
  }

  testPoint(pointX, pointY) {
    const n = this.worldVertices.length

    for (let i = 0; i < n; i += 2) {
      const j = i < n - 2 ? i + 2 : 0

      const x0 = this.worldVertices[i]
      const y0 = this.worldVertices[i + 1]
      const x1 = this.worldVertices[j]
      const y1 = this.worldVertices[j + 1]

      const edgeX = x1 - x0
      const edgeY = y1 - y0
      const abX = pointX - x0
      const abY = pointY - y0

      if (edgeX * abY - edgeY * abX < 0) {
        return false
      }
    }

    return true
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

    Vertices.getCentroid(this.worldVertices, this.center)
    this.updateAABB()
  }

  updateAABB() {
    let minX = Infinity
    let minY = Infinity
    let maxX = -minX
    let maxY = -minY

    for (let i = 0; i < this.worldVertices.length; i += 2) {
      const x0 = this.worldVertices[i]
      const y0 = this.worldVertices[i + 1]

      if (x0 < minX) minX = x0
      if (x0 > maxX) maxX = x0

      if (y0 < minY) minY = y0
      if (y0 > maxY) maxY = y0
    }

    this.aabb.set(minX, minY, maxX, maxY)
    return this.aabb
  }
}
