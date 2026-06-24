import Vector from "./Vector.js"
import AABB from "./AABB.js"

export default class Vertices {
  constructor() {}
  static getArea(vertices) {
    let area = 0
    const n = vertices.length

    for (let i = 0; i < n; i += 2) {
      const x0 = vertices[i]
      const y0 = vertices[i + 1]
      const x1 = vertices[(i + 2) % n]
      const y1 = vertices[(i + 3) % n]

      area += x0 * y1 - y0 * x1
    }
    return area * 0.5
  }

  static getInertia(vertices, mass) {
    let numerator = 0
    let denomerator = 0
    const n = vertices.length

    for (let i = 0; i < n; i += 2) {
      const x0 = vertices[i]
      const y0 = vertices[i + 1]
      const x1 = vertices[(i + 2) % n]
      const y1 = vertices[(i + 3) % n]

      const cross = x0 * y1 - y0 * x1
      const dot0 = x0 * x0 + y0 * y0
      const dot01 = x0 * x1 + y0 * y1
      const dot1 = x1 * x1 + y1 * y1

      numerator += cross * (dot0 + dot01 + dot1)
      denomerator += cross
    }

    return (mass / 6) * (numerator / denomerator)
  }

  static getCentroid(vertices, out = new Vector()) {
    let area = 0
    let centroidX = 0
    let centroidY = 0
    const n = vertices.length

    for (let i = 0; i < n; i += 2) {
      const x0 = vertices[i]
      const y0 = vertices[i + 1]
      const x1 = vertices[(i + 2) % n]
      const y1 = vertices[(i + 3) % n]
      const cross = x0 * y1 - y0 * x1

      centroidX += (x0 + x1) * cross
      centroidY += (y0 + y1) * cross
      area += cross
    }

    area *= 0.5
    out.x = centroidX / (6 * area)
    out.y = centroidY / (6 * area)

    return out
  }

  static getMean(vertices, out = new Vector()) {
    let sumX = 0
    let sumY = 0
    const n = vertices.length

    for (let i = 0; i < n; i += 2) {
      sumX += vertices[i]
      sumY += vertices[i + 1]
    }

    const count = n >> 1

    out.x = sumX / count
    out.y = sumY / count

    return out
  }

  static getAABB(vertices, out = new AABB()) {
    out.set(Infinity, Infinity, -Infinity, -Infinity)

    for (let i = 0; i < vertices.length; i += 2) {
      const x0 = vertices[i]
      const y0 = vertices[i + 1]

      if (x0 < out.minX) out.minX = x0
      if (y0 < out.minY) out.minY = y0
      if (x0 > out.maxX) out.maxX = x0
      if (y0 > out.maxY) out.maxY = y0
    }

    return out
  }

  static rotate(vertices, cos, sin) {
    for (let i = 0; i < vertices.length; i += 2) {
      const x0 = vertices[i]
      const y0 = vertices[i + 1]

      vertices[i] = x0 * cos - y0 * sin
      vertices[i + 1] = x0 * sin + y0 * cos
    }

    return vertices
  }
}
