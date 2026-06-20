import Vector from "./Vector.js"
import Pool from "./Pool.js"

export default class Collision {
  #_simplex
  #_vectors
  constructor() {
    this.#_simplex = []
    this.#_vectors = new Pool(() => new Vector(), 16)
  }
  get vectorsSize() {
    return this.#_vectors.size
  }
  detect(vertsA, vertsB, dir) {
    if (dir.isZero()) {
      dir.set(1, 0)
    }

    this.#_simplex.length = 0
    this.#_simplex.push(this.#_getSupportPoint(vertsA, vertsB, dir))
    dir.negate()

    while (true) {
      const support = this.#_getSupportPoint(vertsA, vertsB, dir)

      if (this.#_vectors.at(support).dot(dir) <= 0) {
        this.#_vectors.deallocate(support)
        for (let i = 0; i < this.#_simplex.length; ++i) {
          this.#_vectors.deallocate(this.#_simplex[i])
        }

        return null
      }

      this.#_simplex.push(support)

      if (this.#_simplex.length === 2) {
        this.#_handleLineSimplex(this.#_simplex, dir)
        continue
      }

      if (this.#_handleTriangleSimplex(this.#_simplex, dir)) {
        const { normal, overlap, polytope } = this.#_EPA(
          vertsA,
          vertsB,
          this.#_simplex,
          dir
        )
        const { ref, inc, contactPoints } = this.#_getContactPoints(
          vertsA,
          vertsB,
          normal
        )

        return {
          normal,
          overlap,
          polytope,
          ref,
          inc,
          contactPoints
        }
      }
    }
  }
  #_getContactPoints(vertsA, vertsB, normal, contactPoints = []) {
    const ref = this.#_bestEdge(vertsA, normal.x, normal.y)
    const inc = this.#_bestEdge(vertsB, -normal.x, -normal.y)

    const edgeDirX = ref.edge[2] - ref.edge[0]
    const edgeDirY = ref.edge[3] - ref.edge[1]

    const firstClipping = this.#_clipEdge(
      inc.edge,
      ref.edge[0],
      ref.edge[1],
      edgeDirX,
      edgeDirY,
      true
    )

    let secondClipping = firstClipping

    if (firstClipping.count > 1) {
      secondClipping = this.#_clipEdge(
        firstClipping.points,
        ref.edge[2],
        ref.edge[3],
        -edgeDirX,
        -edgeDirY,
        true
      )
    }

    let finalClipping = secondClipping

    if (secondClipping.count > 1) {
      finalClipping = this.#_clipEdge(
        secondClipping.points,
        ref.edge[0],
        ref.edge[1],
        -edgeDirY,
        edgeDirX,
        false
      )
    }

    const proj0 = ref.edge[0] * normal.x + ref.edge[1] * normal.y
    const proj1 = ref.edge[2] * normal.x + ref.edge[3] * normal.y
    const maxProj = Math.max(proj0, proj1)

    for (let i = 0; i < finalClipping.count; i += 2) {
      const pointId = i >> 1
      const pointX = finalClipping.points[i]
      const pointY = finalClipping.points[i + 1]
      const minProj = pointX * normal.x + pointY * normal.y

      contactPoints.push({
        id: `${ref.id}-${inc.id},${pointId}`,
        pointX,
        pointY,
        overlap: maxProj - minProj
      })
    }

    return {
      ref,
      inc,
      contactPoints
    }
  }
  #_clipEdge(inc, startX, startY, dirX, dirY, isClip = false) {
    const points = new Float32Array(4)
    const d0 = startX * dirX + startY * dirY
    const u0 = inc[0] * dirX + inc[1] * dirY - d0
    const u1 = inc[2] * dirX + inc[3] * dirY - d0

    let count = 0

    if (u0 >= 0) {
      points[count++] = inc[0]
      points[count++] = inc[1]
    }

    if (u1 >= 0) {
      points[count++] = inc[2]
      points[count++] = inc[3]
    }

    if (isClip && u0 * u1 < 0) {
      const deltaX = inc[2] - inc[0]
      const deltaY = inc[3] - inc[1]
      const t = u0 / (u0 - u1)

      points[count++] = inc[0] + deltaX * t
      points[count++] = inc[1] + deltaY * t
    }

    return { points, count }
  }
  #_bestEdge(vertices, dx, dy) {
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

    const edge = new Float32Array(4)
    let id = 0

    if (prevDot > nextDot) {
      edge[0] = prevX
      edge[1] = prevY
      edge[2] = bestX
      edge[3] = bestY
      id = prevI >> 1
    } else {
      edge[0] = bestX
      edge[1] = bestY
      edge[2] = nextX
      edge[3] = nextY
      id = index >> 1
    }

    return { edge, id }
  }
  #_EPA(vertsA, vertsB, simplex, dir) {
    while (true) {
      let minDot = Infinity
      let index = 0

      for (let i = 0; i < simplex.length; ++i) {
        const j = i + 1 > simplex.length - 1 ? 0 : i + 1

        const a = simplex[i]
        const b = simplex[j]

        let perpX = -(this.#_vectors.at(b).y - this.#_vectors.at(a).y)
        let perpY = this.#_vectors.at(b).x - this.#_vectors.at(a).x

        const invMag = 1 / Math.sqrt(perpX * perpX + perpY * perpY)
        perpX *= invMag
        perpY *= invMag

        let dot =
          this.#_vectors.at(a).x * perpX + this.#_vectors.at(a).y * perpY

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

      const support = this.#_getSupportPoint(vertsA, vertsB, dir)
      const dot = this.#_vectors.at(support).dot(dir)

      if (dot - minDot <= 1e-3) {
        const polytope = new Float32Array(simplex.length << 1)

        for (let i = 0; i < simplex.length; ++i) {
          const v = simplex[i]

          polytope[i << 1] = this.#_vectors.at(v).x
          polytope[(i << 1) + 1] = this.#_vectors.at(v).y

          this.#_vectors.deallocate(v)
        }

        this.#_vectors.deallocate(support)

        return {
          normal: dir,
          overlap: minDot,
          polytope
        }
      }

      simplex.splice(index, 0, support)
    }
  }
  #_handleTriangleSimplex(simplex, dir) {
    const [c, b, a] = simplex

    const ab = this.#_vectors.allocate()
    const ac = this.#_vectors.allocate()
    const ao = this.#_vectors.allocate()
    const abPerp = this.#_vectors.allocate()
    const acPerp = this.#_vectors.allocate()

    this.#_vectors
      .at(ab)
      .set(
        this.#_vectors.at(b).x - this.#_vectors.at(a).x,
        this.#_vectors.at(b).y - this.#_vectors.at(a).y
      )
    this.#_vectors
      .at(ac)
      .set(
        this.#_vectors.at(c).x - this.#_vectors.at(a).x,
        this.#_vectors.at(c).y - this.#_vectors.at(a).y
      )
    this.#_vectors.at(ao).copy(this.#_vectors.at(a)).negate()

    this.#_tripleProduct(
      this.#_vectors.at(ac),
      this.#_vectors.at(ab),
      this.#_vectors.at(ab),
      this.#_vectors.at(abPerp)
    )
    this.#_tripleProduct(
      this.#_vectors.at(ab),
      this.#_vectors.at(ac),
      this.#_vectors.at(ac),
      this.#_vectors.at(acPerp)
    )

    if (this.#_vectors.at(abPerp).isZero()) {
      this.#_vectors.at(abPerp).copy(this.#_vectors.at(ab)).perp()
    }

    if (this.#_vectors.at(acPerp).isZero()) {
      this.#_vectors.at(acPerp).copy(this.#_vectors.at(ac)).perp()
    }

    if (this.#_vectors.at(abPerp).dot(this.#_vectors.at(ao)) >= 0) {
      simplex.length = 2
      simplex[0] = b
      simplex[1] = a
      dir.copy(this.#_vectors.at(abPerp))

      this.#_vectors.deallocate(c)
      this.#_vectors.deallocate(ab)
      this.#_vectors.deallocate(ac)
      this.#_vectors.deallocate(ao)
      this.#_vectors.deallocate(abPerp)
      this.#_vectors.deallocate(acPerp)
      return false
    }

    if (this.#_vectors.at(acPerp).dot(this.#_vectors.at(ao)) >= 0) {
      simplex.length = 2
      simplex[0] = c
      simplex[1] = a
      dir.copy(this.#_vectors.at(acPerp))

      this.#_vectors.deallocate(b)
      this.#_vectors.deallocate(ab)
      this.#_vectors.deallocate(ac)
      this.#_vectors.deallocate(ao)
      this.#_vectors.deallocate(abPerp)
      this.#_vectors.deallocate(acPerp)
      return false
    }

    this.#_vectors.deallocate(ab)
    this.#_vectors.deallocate(ac)
    this.#_vectors.deallocate(ao)
    this.#_vectors.deallocate(abPerp)
    this.#_vectors.deallocate(acPerp)
    return true
  }
  #_handleLineSimplex(simplex, dir) {
    const [b, a] = simplex

    const ab = this.#_vectors.allocate()
    const ao = this.#_vectors.allocate()
    const abPerp = this.#_vectors.allocate()

    this.#_vectors
      .at(ab)
      .set(
        this.#_vectors.at(b).x - this.#_vectors.at(a).x,
        this.#_vectors.at(b).y - this.#_vectors.at(a).y
      )
    this.#_vectors.at(ao).copy(this.#_vectors.at(a)).negate()

    this.#_tripleProduct(
      this.#_vectors.at(ab),
      this.#_vectors.at(ao),
      this.#_vectors.at(ab),
      this.#_vectors.at(abPerp)
    )

    if (this.#_vectors.at(abPerp).isZero()) {
      this.#_vectors.at(abPerp).copy(this.#_vectors.at(ab)).perp()
    }

    dir.copy(this.#_vectors.at(abPerp))

    this.#_vectors.deallocate(ab)
    this.#_vectors.deallocate(ao)
    this.#_vectors.deallocate(abPerp)
  }
  #_tripleProduct(u, v, w, out = new Vector()) {
    const dotWU = w.dot(u)
    const dotWV = w.dot(v)

    out.x = v.x * dotWU - u.x * dotWV
    out.y = v.y * dotWU - u.y * dotWV
    return out
  }
  #_getSupportPoint(vertsA, vertsB, dir) {
    let maxDotA = -Infinity
    let indexA = 0

    for (let i = 0; i < vertsA.length; i += 2) {
      const dot = vertsA[i] * dir.x + vertsA[i + 1] * dir.y

      if (dot > maxDotA) {
        maxDotA = dot
        indexA = i
      }
    }

    let minDotB = Infinity
    let indexB = 0

    for (let i = 0; i < vertsB.length; i += 2) {
      const dot = vertsB[i] * dir.x + vertsB[i + 1] * dir.y

      if (dot < minDotB) {
        minDotB = dot
        indexB = i
      }
    }

    const point = this.#_vectors.allocate()

    this.#_vectors.at(point).x = vertsA[indexA] - vertsB[indexB]
    this.#_vectors.at(point).y = vertsA[indexA + 1] - vertsB[indexB + 1]
    return point
  }
}
