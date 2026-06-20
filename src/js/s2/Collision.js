import Vector from "./Vector.js"
import Pool from "./Pool.js"

export default class Collision {
  #simplex
  #vectors
  constructor() {
    this.#simplex = []
    this.#vectors = new Pool(() => new Vector(), 16)
  }
  detect(vertsA, vertsB, dir) {
    if (dir.isZero()) {
      dir.set(1, 0)
    }

    this.#simplex.length = 0
    this.#simplex.push(this.#getSupportPoint(vertsA, vertsB, dir))
    dir.negate()

    while (true) {
      const support = this.#getSupportPoint(vertsA, vertsB, dir)

      if (this.#vectors.at(support).dot(dir) <= 0) {
        this.#vectors.deallocate(support)
        for (let i = 0; i < this.#simplex.length; ++i) {
          this.#vectors.deallocate(this.#simplex[i])
        }

        return null
      }

      this.#simplex.push(support)

      if (this.#simplex.length === 2) {
        this.#handleLineSimplex(this.#simplex, dir)
        continue
      }

      if (this.#handleTriangleSimplex(this.#simplex, dir)) {
        const { normal, overlap, polytope } = this.#EPA(
          vertsA,
          vertsB,
          this.#simplex,
          dir
        )
        const { ref, inc, contactPoints } = this.#getContactPoints(
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
  #getContactPoints(vertsA, vertsB, normal, contactPoints = []) {
    const ref = this.#bestEdge(vertsA, normal.x, normal.y)
    const inc = this.#bestEdge(vertsB, -normal.x, -normal.y)

    const edgeDirX = ref.edge[2] - ref.edge[0]
    const edgeDirY = ref.edge[3] - ref.edge[1]

    const firstClipping = this.#clipEdge(
      inc.edge,
      ref.edge[0],
      ref.edge[1],
      edgeDirX,
      edgeDirY,
      true
    )

    let secondClipping = firstClipping

    if (firstClipping.count > 1) {
      secondClipping = this.#clipEdge(
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
      finalClipping = this.#clipEdge(
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
  #clipEdge(inc, startX, startY, dirX, dirY, isClip = false) {
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
  #EPA(vertsA, vertsB, simplex, dir) {
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

      const support = this.#getSupportPoint(vertsA, vertsB, dir)
      const dot = this.#vectors.at(support).dot(dir)

      if (dot - minDot <= 1e-3) {
        const polytope = new Float32Array(simplex.length << 1)

        for (let i = 0; i < simplex.length; ++i) {
          const v = simplex[i]

          polytope[i << 1] = this.#vectors.at(v).x
          polytope[(i << 1) + 1] = this.#vectors.at(v).y

          this.#vectors.deallocate(v)
        }

        this.#vectors.deallocate(support)

        return {
          normal: dir,
          overlap: minDot,
          polytope
        }
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
  #getSupportPoint(vertsA, vertsB, dir) {
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

    const point = this.#vectors.allocate()

    this.#vectors.at(point).x = vertsA[indexA] - vertsB[indexB]
    this.#vectors.at(point).y = vertsA[indexA + 1] - vertsB[indexB + 1]
    return point
  }
}
