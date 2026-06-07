import Vector from './Vector.js'
import Vertices from './Vertices.js'
import AABB from './AABB.js'

export default class Polygon {
  static uid = 0

  constructor(vertices, options = {}) {
    this.id = Polygon.uid++
    this.type = 'polygon'

    this.vertices = vertices
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

  getWorldVertices(x, y, cos, sin) {
    for (let i = 0; i < this.vertices.length; i += 2) {
      const x0 = this.offset.x + this.vertices[i]
      const y0 = this.offset.y + this.vertices[i + 1]

      this.worldVertices[i] = x + (x0 * cos - y0 * sin)
      this.worldVertices[i + 1] = y + (x0 * sin + y0 * cos)
    }

    return this.worldVertices
  }

  testPoint(x, y, cos, sin, pointX, pointY) {
    const worldVertices = this.getWorldVertices(x, y, cos, sin)
    const n = this.worldVertices.length

    for (let i = 0; i < n; i += 2) {
      const j = (i + 2) % n

      const x0 = worldVertices[i]
      const y0 = worldVertices[i + 1]
      const x1 = worldVertices[j]
      const y1 = worldVertices[j + 1]

      const abX = x1 - x0
      const abY = y1 - y0
      const apX = pointX - x0
      const apY = pointY - y0

      const isOutside = abX * apY - abY * apX < 0

      if (isOutside) {
        return false
      }
    }

    return true
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
