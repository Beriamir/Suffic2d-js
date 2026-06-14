export default class Decomposer {
  constructor() {}

  createConcaveShape(numPoints = 12, radius = 100) {
    const points = []

    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2
      const r = radius * (0.4 + Math.random() * 0.6)

      points.push(Math.cos(angle) * r, Math.sin(angle) * r)
    }

    return new Float32Array(points)
  }

  decompose(polygon, pieces = []) {
    const n = polygon.length

    for (let i = 0; i < n; i += 2) {
      const prevI = (i - 2 + n) % n
      const reflexI = i
      const nextI = (i + 2) % n

      const prevX = polygon[prevI]
      const prevY = polygon[prevI + 1]
      const reflexX = polygon[reflexI]
      const reflexY = polygon[reflexI + 1]
      const nextX = polygon[nextI]
      const nextY = polygon[nextI + 1]

      const prevDirX = reflexX - prevX
      const prevDirY = reflexY - prevY
      const nextDirX = nextX - reflexX
      const nextDirY = nextY - reflexY

      if (!this.isReflex(prevDirX, prevDirY, nextDirX, nextDirY)) {
        continue
      }

      let bestX = null
      let bestY = null
      let bestIndex = -1
      let bestDistSq = Infinity
      let bestIsReflex = false

      for (let j = 0; j < n; j += 2) {
        const prevJ = (j - 2 + n) % n
        const targetJ = j
        const nextJ = (j + 2) % n

        if (targetJ === reflexI || targetJ === prevI || targetJ === nextI) {
          continue
        }

        const targetX = polygon[targetJ]
        const targetY = polygon[targetJ + 1]

        const midX = (reflexX + targetX) * 0.5
        const midY = (reflexY + targetY) * 0.5

        if (!this.pointInPolygon(midX, midY, polygon)) {
          continue
        }

        let validSplit = true

        for (let e = 0; e < n; e += 2) {
          const edgeAI = e
          const edgeBI = (e + 2) % n

          if (
            edgeAI === reflexI ||
            edgeBI === reflexI ||
            edgeAI === targetJ ||
            edgeBI === targetJ
          ) {
            continue
          }

          const edgeAX = polygon[edgeAI]
          const edgeAY = polygon[edgeAI + 1]
          const edgeBX = polygon[edgeBI]
          const edgeBY = polygon[edgeBI + 1]

          const hitPoint = this.lineIntersect(
            reflexX,
            reflexY,
            targetX,
            targetY,
            edgeAX,
            edgeAY,
            edgeBX,
            edgeBY
          )

          if (!hitPoint) continue

          const reflexDistSq = this.distanceSq(
            hitPoint.x,
            hitPoint.y,
            reflexX,
            reflexY
          )

          const targetDistSq = this.distanceSq(
            hitPoint.x,
            hitPoint.y,
            targetX,
            targetY
          )

          const EPS = 1e-9

          if (reflexDistSq > EPS && targetDistSq > EPS) {
            validSplit = false
            break
          }
        }

        if (!validSplit) continue

        const prevJDirX = targetX - polygon[prevJ]
        const prevJDirY = targetY - polygon[prevJ + 1]
        const nextJDirX = polygon[nextJ] - targetX
        const nextJDirY = polygon[nextJ + 1] - targetY

        const targetIsReflex = this.isReflex(
          prevJDirX,
          prevJDirY,
          nextJDirX,
          nextJDirY
        )

        const splitDistSq = this.distanceSq(reflexX, reflexY, targetX, targetY)

        if (
          (targetIsReflex && !bestIsReflex) ||
          (targetIsReflex === bestIsReflex && splitDistSq < bestDistSq)
        ) {
          bestX = targetX
          bestY = targetY
          bestIndex = targetJ
          bestDistSq = splitDistSq
          bestIsReflex = targetIsReflex
        }
      }

      if (bestX === null) continue

      const startIndex = reflexI
      const endIndex = bestIndex

      const polyA = []
      const polyB = []

      if (endIndex === -1) {
        let edgeSplitIndex = -1

        for (let e = 0; e < n; e += 2) {
          const edgeAI = e
          const edgeBI = (e + 2) % n

          const ax = polygon[edgeAI]
          const ay = polygon[edgeAI + 1]
          const bx = polygon[edgeBI]
          const by = polygon[edgeBI + 1]

          const abX = bx - ax
          const abY = by - ay

          const asX = bestX - ax
          const asY = bestY - ay

          const cross = Math.abs(abX * asY - abY * asX)

          if (cross > 1e-6) continue

          const dot = abX * asX + abY * asY
          const abLenSq = abX * abX + abY * abY

          if (dot < 0 || dot > abLenSq) continue

          edgeSplitIndex = e
          break
        }

        if (edgeSplitIndex === -1) continue

        const steinerPoly = [...polygon]
        steinerPoly.splice(edgeSplitIndex + 2, 0, bestX, bestY)

        return this.decompose(steinerPoly, pieces)
      }

      if (startIndex === endIndex) return pieces

      for (let i = startIndex; ; i = (i + 2) % n) {
        polyA.push(polygon[i], polygon[i + 1])
        if (i === endIndex) break
      }

      for (let i = endIndex; ; i = (i + 2) % n) {
        polyB.push(polygon[i], polygon[i + 1])
        if (i === startIndex) break
      }

      if (polyA.length >= 6) this.decompose(polyA, pieces)
      if (polyB.length >= 6) this.decompose(polyB, pieces)

      return pieces
    }

    pieces.push(polygon)
    return pieces
  }

  distanceSq(uX, uY, vX, vY) {
    const dx = vX - uX
    const dy = vY - uY
    return dx * dx + dy * dy
  }

  isReflex(uX, uY, vX, vY) {
    return uX * vY - uY * vX < 0
  }

  lineIntersect(aX, aY, bX, bY, cX, cY, dX, dY) {
    const dx1 = bX - aX
    const dy1 = bY - aY
    const dx2 = dX - cX
    const dy2 = dY - cY

    const cross = dx1 * dy2 - dy1 * dx2
    const EPS = 1e-9

    if (Math.abs(cross) < EPS) return null

    const acX = cX - aX
    const acY = cY - aY

    const t = (acX * dy2 - acY * dx2) / cross
    const u = (acX * dy1 - acY * dx1) / cross

    if (t >= -EPS && t <= 1 + EPS && u >= -EPS && u <= 1 + EPS) {
      return {
        x: aX + dx1 * t,
        y: aY + dy1 * t
      }
    }

    return null
  }

  pointInPolygon(pX, pY, polygon) {
    const n = polygon.length
    let inside = false

    for (let i = 0; i < n; i += 2) {
      const j = (i + 2) % n

      const xi = polygon[i]
      const yi = polygon[i + 1]
      const xj = polygon[j]
      const yj = polygon[j + 1]

      const intersect =
        yi > pY !== yj > pY && pX < ((xj - xi) * (pY - yi)) / (yj - yi) + xi

      if (intersect) inside = !inside
    }

    return inside
  }

  midPoint(aX, aY, bX, bY) {
    return {
      x: (aX + bX) * 0.5,
      y: (aY + bY) * 0.5
    }
  }
}
