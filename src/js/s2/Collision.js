import Vector from './Vector.js'
import Vertices from './Vertices.js'

export default class Collision {
  constructor() {
    this.vectors = []
    this.freeList = -1
    this.growVectors(16)
  }

  growVectors(capacity) {
    const start = this.vectors.length
    const end = start + capacity

    for (let i = start; i < end; ++i) {
      this.vectors[i] = new Vector()
      this.vectors[i].next = i + 1
    }

    this.vectors[end - 1].next = this.freeList
    this.freeList = start
  }

  allocateVector() {
    if (this.freeList < 0) {
      this.growVectors(this.vectors.length)
    }

    const index = this.freeList

    this.freeList = this.vectors[index].next
    this.vectors[index].next = -1
    this.vectors[index].allocated = true

    return index
  }

  deallocateVector(index) {
    if (!this.vectors[index].allocated) {
      return
    }

    this.vectors[index].zero()
    this.vectors[index].next = this.freeList
    this.vectors[index].allocated = false
    this.freeList = index
  }

  detect(vertsA, vertsB) {
    const meanA = this.allocateVector()
    const meanB = this.allocateVector()

    Vertices.getMean(vertsA, this.vectors[meanA])
    Vertices.getMean(vertsB, this.vectors[meanB])

    const dir = Vector.sub(this.vectors[meanB], this.vectors[meanA])

    this.deallocateVector(meanA)
    this.deallocateVector(meanB)

    if (dir.isZero()) {
      dir.set(1, 0)
    }

    const simplex = []

    simplex.push(this.support(vertsA, vertsB, dir))
    dir.negate()

    while (true) {
      const support = this.support(vertsA, vertsB, dir)

      if (this.vectors[support].dot(dir) <= 0) {
        this.deallocateVector(support)
        for (let i = 0; i < simplex.length; ++i) {
          this.deallocateVector(simplex[i])
        }

        return null
      }

      simplex.push(support)

      if (simplex.length === 2) {
        this.handleLineSimplex(simplex, dir)
        continue
      }

      if (this.handleTriangleSimplex(simplex, dir)) {
        const { normal, overlap, polytope } = this.expandingPolytope(
          vertsA,
          vertsB,
          simplex,
          dir
        )
        const { ref, inc, contactPoints } = this.getContactPoints(
          vertsA,
          vertsB,
          normal
        )

        return {
          normal,
          overlap,
          polytope,
          contactPoints,
          ref,
          inc
        }
      }
    }
  }

  getContactPoints(vertsA, vertsB, normal, contactPoints = []) {
    const ref = this.bestEdge(vertsA, normal.x, normal.y)
    const inc = this.bestEdge(vertsB, -normal.x, -normal.y)

    const edgeDirX = ref.edge[2] - ref.edge[0]
    const edgeDirY = ref.edge[3] - ref.edge[1]

    const firstClipping = this.clipEdge(
      inc.edge,
      ref.edge[0],
      ref.edge[1],
      edgeDirX,
      edgeDirY,
      true
    )

    let secondClipping = firstClipping

    if (firstClipping.count > 1) {
      secondClipping = this.clipEdge(
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
      finalClipping = this.clipEdge(
        secondClipping.points,
        ref.edge[0],
        ref.edge[1],
        -edgeDirY,
        edgeDirX,
        false
      )
    }

    const maxProj = ref.edge[0] * normal.x + ref.edge[1] * normal.y

    for (let i = 0; i < finalClipping.count; i += 2) {
      const pointId = i >> 1
      const pointX = finalClipping.points[i]
      const pointY = finalClipping.points[i + 1]
      const minProj = pointX * normal.x + pointY * normal.y

      contactPoints.push({
        // id: `${ref.id}-${inc.id}-${pointId}`,
        id: (ref.id << 16) | (inc.id << 8) | pointId,
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

  clipEdge(inc, startX, startY, dirX, dirY, isClip = false) {
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

  bestEdge(vertices, dx, dy) {
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
    const prevIndex = index >= 2 ? index - 2 : index - 2 + n
    const nextIndex = index < n - 2 ? index + 2 : index + 2 - n

    const prevX = vertices[prevIndex]
    const prevY = vertices[prevIndex + 1]
    const bestX = vertices[index]
    const bestY = vertices[index + 1]
    const nextX = vertices[nextIndex]
    const nextY = vertices[nextIndex + 1]

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
      id = prevIndex >> 1
    } else {
      edge[0] = bestX
      edge[1] = bestY
      edge[2] = nextX
      edge[3] = nextY
      id = index >> 1
    }

    return { edge, id }
  }

  expandingPolytope(vertsA, vertsB, simplex, dir) {
    while (true) {
      let minDot = Infinity
      let index = 0

      for (let i = 0; i < simplex.length; ++i) {
        const j = i + 1 > simplex.length - 1 ? 0 : i + 1

        const a = simplex[i]
        const b = simplex[j]

        let perpX = -(this.vectors[b].y - this.vectors[a].y)
        let perpY = this.vectors[b].x - this.vectors[a].x

        const invMag = 1 / Math.sqrt(perpX * perpX + perpY * perpY)
        perpX *= invMag
        perpY *= invMag

        let dot = this.vectors[a].x * perpX + this.vectors[a].y * perpY

        if (dot < minDot) {
          minDot = dot
          dir.set(perpX, perpY)
          index = j
        }
      }

      const support = this.support(vertsA, vertsB, dir)
      const dot = this.vectors[support].dot(dir)

      if (dot - minDot <= 1e-3) {
        const polytope = new Float32Array(simplex.length << 1)

        for (let i = 0; i < simplex.length; ++i) {
          const v = simplex[i]

          polytope[i << 1] = this.vectors[v].x
          polytope[(i << 1) + 1] = this.vectors[v].y

          this.deallocateVector(v)
        }

        this.deallocateVector(support)

        return {
          normal: dir,
          overlap: minDot,
          polytope
        }
      }

      simplex.splice(index, 0, support)
    }
  }

  handleTriangleSimplex(simplex, dir) {
    const [c, b, a] = simplex

    const ab = this.allocateVector()
    const ac = this.allocateVector()
    const ao = this.allocateVector()
    const abPerp = this.allocateVector()
    const acPerp = this.allocateVector()

    this.vectors[ab].set(
      this.vectors[b].x - this.vectors[a].x,
      this.vectors[b].y - this.vectors[a].y
    )
    this.vectors[ac].set(
      this.vectors[c].x - this.vectors[a].x,
      this.vectors[c].y - this.vectors[a].y
    )
    this.vectors[ao].copy(this.vectors[a]).negate()

    this.tripleProduct(
      this.vectors[ac],
      this.vectors[ab],
      this.vectors[ab],
      this.vectors[abPerp]
    )
    this.tripleProduct(
      this.vectors[ab],
      this.vectors[ac],
      this.vectors[ac],
      this.vectors[acPerp]
    )

    if (this.vectors[abPerp].isZero()) {
      this.vectors[abPerp].copy(this.vectors[ab]).perp()
    }

    if (this.vectors[acPerp].isZero()) {
      this.vectors[acPerp].copy(this.vectors[ac]).perp()
    }

    if (this.vectors[abPerp].dot(this.vectors[ao]) >= 0) {
      simplex.length = 2
      simplex[0] = b
      simplex[1] = a
      dir.copy(this.vectors[abPerp])

      this.deallocateVector(c)
      this.deallocateVector(ab)
      this.deallocateVector(ac)
      this.deallocateVector(ao)
      this.deallocateVector(abPerp)
      this.deallocateVector(acPerp)

      return false
    }

    if (this.vectors[acPerp].dot(this.vectors[ao]) >= 0) {
      simplex.length = 2
      simplex[0] = c
      simplex[1] = a
      dir.copy(this.vectors[acPerp])

      this.deallocateVector(b)
      this.deallocateVector(ab)
      this.deallocateVector(ac)
      this.deallocateVector(ao)
      this.deallocateVector(abPerp)
      this.deallocateVector(acPerp)

      return false
    }

    this.deallocateVector(ab)
    this.deallocateVector(ac)
    this.deallocateVector(ao)
    this.deallocateVector(abPerp)
    this.deallocateVector(acPerp)
    return true
  }

  handleLineSimplex(simplex, dir) {
    const [b, a] = simplex

    const ab = this.allocateVector()
    const ao = this.allocateVector()
    const abPerp = this.allocateVector()

    this.vectors[ab].set(
      this.vectors[b].x - this.vectors[a].x,
      this.vectors[b].y - this.vectors[a].y
    )
    this.vectors[ao].copy(this.vectors[a]).negate()

    this.tripleProduct(
      this.vectors[ab],
      this.vectors[ao],
      this.vectors[ab],
      this.vectors[abPerp]
    )

    if (this.vectors[abPerp].isZero()) {
      this.vectors[abPerp].copy(this.vectors[ab]).perp()
    }

    dir.copy(this.vectors[abPerp])

    this.deallocateVector(ab)
    this.deallocateVector(ao)
    this.deallocateVector(abPerp)
  }

  tripleProduct(u, v, w, out = new Vector()) {
    const dotWU = w.dot(u)
    const dotWV = w.dot(v)

    out.x = v.x * dotWU - u.x * dotWV
    out.y = v.y * dotWU - u.y * dotWV

    return out
  }

  support(vertsA, vertsB, dir) {
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

    const point = this.allocateVector()

    this.vectors[point].x = vertsA[indexA] - vertsB[indexB]
    this.vectors[point].y = vertsA[indexA + 1] - vertsB[indexB + 1]

    return point
  }
}
