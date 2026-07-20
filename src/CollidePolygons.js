import Vector from "./Vector.js"
import Pool from "./Pool.js"

export default class CollidePolygons {
  #simplex = []
  #arrays = new Pool(() => [], 16)
  #vectors = new Pool(() => new Vector(), 16)
  constructor() {}

  collide(sA, sB, manifold = {}) {
    if (!sA.aabb.overlaps(sB.aabb)) {
      return null
    }

    // Uses GJK to detect overlaps.
    // EPA to compute penetration depth and collision normal.
    // Sutherland–Hodgman clipping generates the contact points.
    const dir = this.#vectors.allocate()

    this.#vectors.at(dir).x = sB.center.x - sA.center.x
    this.#vectors.at(dir).y = sB.center.y - sA.center.y

    const verticesA = sA.worldVertices
    const verticesB = sB.worldVertices

    if (this.#vectors.at(dir).isZero()) {
      this.#vectors.at(dir).set(1, 0)
    }

    this.#simplex.length = 0
    this.#simplex.push(
      this.#getSupportPolygons(verticesA, verticesB, this.#vectors.at(dir))
    )
    this.#vectors.at(dir).negate()

    while (true) {
      const support = this.#getSupportPolygons(
        verticesA,
        verticesB,
        this.#vectors.at(dir)
      )

      // Does it contain the origin?
      if (this.#vectors.at(support).dot(this.#vectors.at(dir)) <= 0) {
        this.#vectors.deallocate(support)
        for (let i = 0; i < this.#simplex.length; ++i) {
          this.#vectors.deallocate(this.#simplex[i])
        }

        this.#vectors.deallocate(dir)

        return null
      }

      this.#simplex.push(support)

      if (this.#simplex.length === 2) {
        this.#handleLineSimplex(this.#simplex, this.#vectors.at(dir))
        continue
      }

      if (this.#handleTriangleSimplex(this.#simplex, this.#vectors.at(dir))) {
        this.#EPA(
          verticesA,
          verticesB,
          this.#simplex,
          this.#vectors.at(dir),
          manifold
        )
        this.#getContactPoints(verticesA, verticesB, manifold)
        this.#vectors.deallocate(dir)

        return manifold
      }
    }
  }

  #getContactPoints(verticesA, verticesB, manifold) {
    const normalX = manifold.normalX
    const normalY = manifold.normalY

    const ref = this.#bestEdge(verticesA, normalX, normalY)
    const inc = this.#bestEdge(verticesB, -normalX, -normalY)

    const refDirX = ref.edge[2] - ref.edge[0]
    const refDirY = ref.edge[3] - ref.edge[1]

    const firstClipping = this.#clipEdge(
      inc.edge,
      ref.edge[0],
      ref.edge[1],
      refDirX,
      refDirY
    )

    let secondClipping = firstClipping

    if (this.#arrays.at(firstClipping).length > 1) {
      secondClipping = this.#clipEdge(
        this.#arrays.at(firstClipping),
        ref.edge[2],
        ref.edge[3],
        -refDirX,
        -refDirY
      )

      this.#arrays.deallocate(firstClipping)
    }

    let finalClipping = secondClipping

    if (this.#arrays.at(secondClipping).length > 1) {
      finalClipping = this.#clipEdge(
        this.#arrays.at(secondClipping),
        ref.edge[0],
        ref.edge[1],
        -refDirY,
        refDirX
      )

      this.#arrays.deallocate(secondClipping)
    }

    manifold.ref = ref
    manifold.inc = inc
    manifold.contactPoints = []

    const dot0 = ref.edge[0] * normalX + ref.edge[1] * normalY
    const dot1 = ref.edge[2] * normalX + ref.edge[3] * normalY
    const clippingDot = Math.max(dot0, dot1)

    for (let i = 0; i < this.#arrays.at(finalClipping).length; i += 2) {
      const pointX = this.#arrays.at(finalClipping)[i]
      const pointY = this.#arrays.at(finalClipping)[i + 1]
      const pointDot = pointX * normalX + pointY * normalY

      manifold.contactPoints.push({
        id: `${ref.id}-${inc.id},${i >> 1}`,
        pointX,
        pointY,
        overlap: clippingDot - pointDot
      })
    }

    this.#arrays.deallocate(finalClipping)

    return manifold
  }

  #clipEdge(inc, startX, startY, dirX, dirY) {
    const result = this.#arrays.allocate()
    const d0 = startX * dirX + startY * dirY
    const u0 = inc[0] * dirX + inc[1] * dirY - d0
    const u1 = inc[2] * dirX + inc[3] * dirY - d0

    this.#arrays.at(result).length = 0

    if (u0 >= 0) {
      this.#arrays.at(result).push(inc[0], inc[1])
    }

    if (u1 >= 0) {
      this.#arrays.at(result).push(inc[2], inc[3])
    }

    if (u0 * u1 < 0) {
      const deltaX = inc[2] - inc[0]
      const deltaY = inc[3] - inc[1]
      const t = u0 / (u0 - u1)

      this.#arrays.at(result).push(inc[0] + deltaX * t, inc[1] + deltaY * t)
    }

    return result
  }

  #bestEdge(vertices, dx, dy) {
    let bestDot = -Infinity
    let index = 0

    for (let i = 0; i < vertices.length; i += 2) {
      const dot = vertices[i] * dx + vertices[i + 1] * dy

      if (dot > bestDot) {
        bestDot = dot
        index = i
      }
    }

    const n = vertices.length
    const prevI = index >= 2 ? index - 2 : index - 2 + n
    const nextI = index < n - 2 ? index + 2 : index + 2 - n

    const prevX = vertices[prevI]
    const prevY = vertices[prevI + 1]
    const bestX = vertices[index]
    const bestY = vertices[index + 1]
    const nextX = vertices[nextI]
    const nextY = vertices[nextI + 1]

    const prevDirX = prevX - bestX
    const prevDirY = prevY - bestY
    const nextDirX = nextX - bestX
    const nextDirY = nextY - bestY

    const prevDot = prevDirX * dx + prevDirY * dy
    const nextDot = nextDirX * dx + nextDirY * dy

    const edge = []
    let id = index >> 1

    if (prevDot > nextDot) {
      edge.push(prevX, prevY, bestX, bestY)
      id = prevI >> 1
    } else {
      edge.push(bestX, bestY, nextX, nextY)
    }

    return { edge, id }
  }

  #EPA(verticesA, verticesB, simplex, dir, manifold = {}) {
    while (true) {
      let minDot = Infinity
      let index = 0

      for (let i = 0; i < simplex.length; ++i) {
        const j = i + 1 > simplex.length - 1 ? 0 : i + 1

        const a = simplex[i]
        const b = simplex[j]

        let perpX = -(this.#vectors.at(b).y - this.#vectors.at(a).y)
        let perpY = this.#vectors.at(b).x - this.#vectors.at(a).x

        const mag = Math.sqrt(perpX * perpX + perpY * perpY)
        const invMag = 1 / mag

        perpX *= invMag
        perpY *= invMag

        let dot = this.#vectors.at(a).x * perpX + this.#vectors.at(a).y * perpY

        // You'll thank this check later
        if (dot < 0) {
          dot = -dot
          perpX = -perpX
          perpY = -perpY
        }

        if (dot < minDot) {
          minDot = dot
          dir.set(perpX, perpY)
          index = j
        }
      }

      const support = this.#getSupportPolygons(verticesA, verticesB, dir)
      const dot = this.#vectors.at(support).dot(dir)

      if (dot - minDot <= 1e-4) {
        manifold.polytope = new Float32Array(simplex.length << 1)
        manifold.normalX = dir.x
        manifold.normalY = dir.y
        manifold.overlap = minDot

        for (let i = 0; i < simplex.length; ++i) {
          const v = simplex[i]

          manifold.polytope[i << 1] = this.#vectors.at(v).x
          manifold.polytope[(i << 1) + 1] = this.#vectors.at(v).y

          this.#vectors.deallocate(v)
        }

        this.#vectors.deallocate(support)

        return manifold
      }

      simplex.splice(index, 0, support)
    }
  }

  #handleTriangleSimplex(simplex, dir) {
    const [c, b, a] = simplex

    const ab = this.#vectors.allocate()
    const ac = this.#vectors.allocate()
    const ao = this.#vectors.allocate()
    const abPerp = this.#vectors.allocate()
    const acPerp = this.#vectors.allocate()

    this.#vectors
      .at(ab)
      .set(
        this.#vectors.at(b).x - this.#vectors.at(a).x,
        this.#vectors.at(b).y - this.#vectors.at(a).y
      )
    this.#vectors
      .at(ac)
      .set(
        this.#vectors.at(c).x - this.#vectors.at(a).x,
        this.#vectors.at(c).y - this.#vectors.at(a).y
      )
    this.#vectors.at(ao).copy(this.#vectors.at(a)).negate()

    this.#tripleProduct(
      this.#vectors.at(ac),
      this.#vectors.at(ab),
      this.#vectors.at(ab),
      this.#vectors.at(abPerp)
    )
    this.#tripleProduct(
      this.#vectors.at(ab),
      this.#vectors.at(ac),
      this.#vectors.at(ac),
      this.#vectors.at(acPerp)
    )

    if (this.#vectors.at(abPerp).isZero()) {
      this.#vectors.at(abPerp).copy(this.#vectors.at(ab)).perp()
    }

    if (this.#vectors.at(acPerp).isZero()) {
      this.#vectors.at(acPerp).copy(this.#vectors.at(ac)).perp()
    }

    if (this.#vectors.at(abPerp).dot(this.#vectors.at(ao)) >= 0) {
      simplex.length = 2
      simplex[0] = b
      simplex[1] = a
      dir.copy(this.#vectors.at(abPerp))

      this.#vectors.deallocate(c)
      this.#vectors.deallocate(ab)
      this.#vectors.deallocate(ac)
      this.#vectors.deallocate(ao)
      this.#vectors.deallocate(abPerp)
      this.#vectors.deallocate(acPerp)
      return false
    }

    if (this.#vectors.at(acPerp).dot(this.#vectors.at(ao)) >= 0) {
      simplex.length = 2
      simplex[0] = c
      simplex[1] = a
      dir.copy(this.#vectors.at(acPerp))

      this.#vectors.deallocate(b)
      this.#vectors.deallocate(ab)
      this.#vectors.deallocate(ac)
      this.#vectors.deallocate(ao)
      this.#vectors.deallocate(abPerp)
      this.#vectors.deallocate(acPerp)
      return false
    }

    this.#vectors.deallocate(ab)
    this.#vectors.deallocate(ac)
    this.#vectors.deallocate(ao)
    this.#vectors.deallocate(abPerp)
    this.#vectors.deallocate(acPerp)
    return true
  }

  #handleLineSimplex(simplex, dir) {
    const [b, a] = simplex

    const ab = this.#vectors.allocate()
    const ao = this.#vectors.allocate()
    const abPerp = this.#vectors.allocate()

    this.#vectors
      .at(ab)
      .set(
        this.#vectors.at(b).x - this.#vectors.at(a).x,
        this.#vectors.at(b).y - this.#vectors.at(a).y
      )
    this.#vectors.at(ao).copy(this.#vectors.at(a)).negate()

    this.#tripleProduct(
      this.#vectors.at(ab),
      this.#vectors.at(ao),
      this.#vectors.at(ab),
      this.#vectors.at(abPerp)
    )

    if (this.#vectors.at(abPerp).isZero()) {
      this.#vectors.at(abPerp).copy(this.#vectors.at(ab)).perp()
    }

    dir.copy(this.#vectors.at(abPerp))

    this.#vectors.deallocate(ab)
    this.#vectors.deallocate(ao)
    this.#vectors.deallocate(abPerp)
  }

  #tripleProduct(u, v, w, out = new Vector()) {
    const dotWU = w.dot(u)
    const dotWV = w.dot(v)

    out.x = v.x * dotWU - u.x * dotWV
    out.y = v.y * dotWU - u.y * dotWV
    return out
  }

  #bestPoint(vertices, dx, dy) {
    let bestDot = -Infinity
    let bestInd = 0

    for (let i = 0; i < vertices.length; i += 2) {
      const dot = vertices[i] * dx + vertices[i + 1] * dy

      if (dot > bestDot) {
        bestDot = dot
        bestInd = i
      }
    }

    const point = this.#vectors.allocate()

    this.#vectors.at(point).x = vertices[bestInd]
    this.#vectors.at(point).y = vertices[bestInd + 1]

    return point
  }

  #getSupportPolygons(verticesA, verticesB, dir) {
    const bestA = this.#bestPoint(verticesA, dir.x, dir.y)
    const bestB = this.#bestPoint(verticesB, -dir.x, -dir.y)
    const point = this.#vectors.allocate()

    this.#vectors.at(point).x =
      this.#vectors.at(bestA).x - this.#vectors.at(bestB).x
    this.#vectors.at(point).y =
      this.#vectors.at(bestA).y - this.#vectors.at(bestB).y

    this.#vectors.deallocate(bestA)
    this.#vectors.deallocate(bestB)

    return point
  }
}
