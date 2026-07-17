export default class CollidePolygonCircle {
  #axes = []
  #projA = {}
  #projB = {}
  constructor() {}

  collide(sA, sB, manifold = {}) {
    if (!sA.aabb.overlaps(sB.aabb)) {
      return null
    }

    const dirX = sB.center.x - sA.center.x
    const dirY = sB.center.y - sA.center.y
    const best = this.#bestPoint(sA.worldVertices, dirX, dirY)

    this.#axes.length = 0
    this.#axes.push(
      sB.center.x - sA.worldVertices[best],
      sB.center.y - sA.worldVertices[best + 1]
    )

    const axes = this.#getAxes(sA.worldVertices, this.#axes)

    let normalX = dirX
    let normalY = dirY
    let overlap = Infinity

    for (let i = 0; i < axes.length; i += 2) {
      const x0 = axes[i]
      const y0 = axes[i + 1]
      const mag = Math.sqrt(x0 * x0 + y0 * y0)

      if (mag == 0) {
        continue
      }

      const invMag = 1 / mag
      const axisX = x0 * invMag
      const axisY = y0 * invMag

      this.#projVertices(sA.worldVertices, axisX, axisY)

      const projB = sB.center.x * axisX + sB.center.y * axisY
      this.#projB.min = projB - sB.radius
      this.#projB.max = projB + sB.radius

      if (
        this.#projA.min > this.#projB.max ||
        this.#projB.min > this.#projA.max
      ) {
        return null
      }

      const minOverlap = Math.min(
        this.#projA.max - this.#projB.min,
        this.#projB.max - this.#projA.min
      )

      if (minOverlap < overlap) {
        normalX = axisX
        normalY = axisY
        overlap = minOverlap
      }
    }

    if (dirX * normalX + dirY * normalY < 0) {
      normalX *= -1
      normalY *= -1
    }

    manifold.normalX = normalX
    manifold.normalY = normalY
    manifold.overlap = overlap
    manifold.contactPoints = [
      {
        id: `${sA.id}-${sB.id},0`,
        pointX: sB.center.x - normalX * sB.radius,
        pointY: sB.center.y - normalY * sB.radius,
        overlap: overlap
      }
    ]

    return manifold
  }

  #getAxes(vertices, axes = []) {
    for (let i = 0; i < vertices.length; i += 2) {
      const j = i < vertices.length - 2 ? i + 2 : 0

      const x0 = vertices[i]
      const y0 = vertices[i + 1]
      const x1 = vertices[j]
      const y1 = vertices[j + 1]

      axes.push(-(y1 - y0), x1 - x0)
    }

    return axes
  }

  #bestPoint(vertices, dx, dy) {
    let max = -Infinity
    let best = -1

    for (let i = 0; i < vertices.length; i += 2) {
      const proj = vertices[i] * dx + vertices[i + 1] * dy

      if (proj > max) {
        max = proj
        best = i
      }
    }

    return best
  }

  #projVertices(vertices, dx, dy) {
    this.#projA.min = Infinity
    this.#projA.max = -Infinity

    for (let i = 0; i < vertices.length; i += 2) {
      const proj = vertices[i] * dx + vertices[i + 1] * dy

      if (proj < this.#projA.min) this.#projA.min = proj
      if (proj > this.#projA.max) this.#projA.max = proj
    }
  }
}
