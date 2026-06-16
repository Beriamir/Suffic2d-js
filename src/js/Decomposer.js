// === PolygonDecomposer class (flattened-array version, no external helpers) ===

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

  // Returns [x, y] for the vertex at the given index, with modulo wraparound.
  // poly is a flat array: [x0, y0, x1, y1, x2, y2, ...]
  at(poly, index) {
    const n = poly.length / 2
    const i = ((index % n) + n) % n
    return [poly[i * 2], poly[i * 2 + 1]]
  }

  sqdist(a, b) {
    const dx = b[0] - a[0]
    const dy = b[1] - a[1]
    return dx * dx + dy * dy
  }

  eq(a, b, epsilon = 1e-10) {
    return Math.abs(a - b) <= epsilon
  }

  cross(o, a, b) {
    return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  }

  left(a, b, c) {
    return this.cross(a, b, c) > 0
  }

  leftOn(a, b, c) {
    return this.cross(a, b, c) >= 0
  }

  right(a, b, c) {
    return this.cross(a, b, c) < 0
  }

  rightOn(a, b, c) {
    return this.cross(a, b, c) <= 0
  }

  // Returns [x, y] of the intersection point
  intersection(p1, p2, q1, q2) {
    let point = [0, 0]

    const a1 = p2[1] - p1[1]
    const b1 = p1[0] - p2[0]
    const c1 = a1 * p1[0] + b1 * p1[1]

    const a2 = q2[1] - q1[1]
    const b2 = q1[0] - q2[0]
    const c2 = a2 * q1[0] + b2 * q1[1]

    const det = a1 * b2 - a2 * b1

    if (!this.eq(det, 0)) {
      point = [(b2 * c1 - b1 * c2) / det, (a1 * c2 - a2 * c1) / det]
    }

    return point
  }

  // Number of vertices in a flat polygon array
  vertexCount(poly) {
    return poly.length / 2
  }

  // Get vertex i (no wraparound) as [x, y]
  vertexAt(poly, i) {
    return [poly[i * 2], poly[i * 2 + 1]]
  }

  // Slice a flat array by vertex indices [startVertex, endVertex) -> flat array
  sliceVerts(poly, startVertex, endVertex) {
    return poly.slice(startVertex * 2, endVertex * 2)
  }

  // Push a [x, y] point onto a flat array (mutates)
  pushVert(poly, point) {
    poly.push(point[0], point[1])
  }

  makeCCW(poly) {
    const n = this.vertexCount(poly)
    let br = 0

    // find bottom right point
    for (let i = 1; i < n; ++i) {
      const vi = this.vertexAt(poly, i)
      const vbr = this.vertexAt(poly, br)
      if (vi[1] < vbr[1] || (vi[1] === vbr[1] && vi[0] > vbr[0])) {
        br = i
      }
    }

    // reverse poly if clockwise
    if (
      !this.left(
        this.at(poly, br - 1),
        this.at(poly, br),
        this.at(poly, br + 1)
      )
    ) {
      // reverse in place, keeping x/y pairs together
      const reversed = []
      for (let i = n - 1; i >= 0; --i) {
        reversed.push(poly[i * 2], poly[i * 2 + 1])
      }
      for (let i = 0; i < poly.length; ++i) {
        poly[i] = reversed[i]
      }
    }
  }

  isReflex(poly, i) {
    return this.right(
      this.at(poly, i - 1),
      this.at(poly, i),
      this.at(poly, i + 1)
    )
  }

  decompose(poly, peices = []) {
    this.makeCCW(poly)

    let upperInt = [0, 0]
    let lowerInt = [0, 0]
    let p = [0, 0]
    let closestVert = [0, 0]

    let upperDist, lowerDist, d, closestDist
    let upperIndex, lowerIndex, closestIndex

    let lowerPoly = []
    let upperPoly = []

    const n = this.vertexCount(poly)

    for (let i = 0; i < n; ++i) {
      if (this.isReflex(poly, i)) {
        upperDist = Infinity
        lowerDist = Infinity

        for (let j = 0; j < n; ++j) {
          if (
            this.left(
              this.at(poly, i - 1),
              this.at(poly, i),
              this.at(poly, j)
            ) &&
            this.rightOn(
              this.at(poly, i - 1),
              this.at(poly, i),
              this.at(poly, j - 1)
            )
          ) {
            p = this.intersection(
              this.at(poly, i - 1),
              this.at(poly, i),
              this.at(poly, j),
              this.at(poly, j - 1)
            )
            if (this.right(this.at(poly, i + 1), this.at(poly, i), p)) {
              d = this.sqdist(this.vertexAt(poly, i), p)
              if (d < lowerDist) {
                lowerDist = d
                lowerInt = p
                lowerIndex = j
              }
            }
          }
          if (
            this.left(
              this.at(poly, i + 1),
              this.at(poly, i),
              this.at(poly, j + 1)
            ) &&
            this.rightOn(
              this.at(poly, i + 1),
              this.at(poly, i),
              this.at(poly, j)
            )
          ) {
            p = this.intersection(
              this.at(poly, i + 1),
              this.at(poly, i),
              this.at(poly, j),
              this.at(poly, j + 1)
            )
            if (this.left(this.at(poly, i - 1), this.at(poly, i), p)) {
              d = this.sqdist(this.vertexAt(poly, i), p)
              if (d < upperDist) {
                upperDist = d
                upperInt = p
                upperIndex = j
              }
            }
          }
        }

        lowerPoly = []
        upperPoly = []

        // Case 1
        if (lowerIndex === (upperIndex + 1) % n) {
          p = [(lowerInt[0] + upperInt[0]) / 2, (lowerInt[1] + upperInt[1]) / 2]

          if (i < upperIndex) {
            lowerPoly = [
              ...lowerPoly,
              ...this.sliceVerts(poly, i, upperIndex + 1)
            ]
            this.pushVert(lowerPoly, p)

            this.pushVert(upperPoly, p)
            if (lowerIndex !== 0) {
              upperPoly = [
                ...upperPoly,
                ...this.sliceVerts(poly, lowerIndex, n)
              ]
            }
            upperPoly = [...upperPoly, ...this.sliceVerts(poly, 0, i + 1)]
          } else {
            if (i !== 0) {
              lowerPoly = [...lowerPoly, ...this.sliceVerts(poly, i, n)]
            }
            lowerPoly = [
              ...lowerPoly,
              ...this.sliceVerts(poly, 0, upperIndex + 1)
            ]
            this.pushVert(lowerPoly, p)

            this.pushVert(upperPoly, p)
            upperPoly = [
              ...upperPoly,
              ...this.sliceVerts(poly, lowerIndex, i + 1)
            ]
          }
        } else {
          // Case 2
          if (lowerIndex > upperIndex) {
            upperIndex += n
          }

          closestDist = Infinity

          for (let j = lowerIndex; j <= upperIndex; ++j) {
            if (
              this.leftOn(
                this.at(poly, i - 1),
                this.at(poly, i),
                this.at(poly, j)
              ) &&
              this.rightOn(
                this.at(poly, i + 1),
                this.at(poly, i),
                this.at(poly, j)
              )
            ) {
              d = this.sqdist(this.at(poly, i), this.at(poly, j))
              if (d < closestDist) {
                closestDist = d
                closestVert = this.at(poly, j)
                closestIndex = ((j % n) + n) % n
              }
            }
          }

          if (i < closestIndex) {
            lowerPoly = [
              ...lowerPoly,
              ...this.sliceVerts(poly, i, closestIndex + 1)
            ]
            if (closestIndex !== 0) {
              upperPoly = [
                ...upperPoly,
                ...this.sliceVerts(poly, closestIndex, n)
              ]
            }
            upperPoly = [...upperPoly, ...this.sliceVerts(poly, 0, i + 1)]
          } else {
            if (i !== 0) {
              lowerPoly = [...lowerPoly, ...this.sliceVerts(poly, i, n)]
            }
            lowerPoly = [
              ...lowerPoly,
              ...this.sliceVerts(poly, 0, closestIndex + 1)
            ]
            upperPoly = [
              ...upperPoly,
              ...this.sliceVerts(poly, closestIndex, i + 1)
            ]
          }
        }

        // solve smallest poly first
        if (this.vertexCount(lowerPoly) < this.vertexCount(upperPoly)) {
          this.decompose(lowerPoly, peices)
          this.decompose(upperPoly, peices)
        } else {
          this.decompose(upperPoly, peices)
          this.decompose(lowerPoly, peices)
        }
        return
      }
    }

    peices.push(poly)
  }
}
