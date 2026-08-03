import Vector from "./Vector.js"
import Pool from "./Pool.js"

export default class CollideCircles {
  #vectors = new Pool(() => new Vector(), 16)
  constructor() {}

  collide(sA, sB, manifold = {}) {
    if (!sA.aabb.overlaps(sB.aabb)) {
      return null
    }

    const dir = this.#vectors.allocate()
    const deltaX = sB.center.x - sA.center.x
    const deltaY = sB.center.y - sA.center.y

    this.#vectors.at(dir).x = deltaX
    this.#vectors.at(dir).y = deltaY

    const magSq = this.#vectors.at(dir).magSq()
    const radiiSum = sA.radius + sB.radius

    if (magSq === 0 || magSq >= radiiSum * radiiSum) {
      this.#vectors.deallocate(dir)
      return null
    }

    const distance = Math.sqrt(magSq)
    const invDistance = 1 / distance
    const normalX = this.#vectors.at(dir).x * invDistance
    const normalY = this.#vectors.at(dir).y * invDistance
    const overlap = radiiSum - distance

    manifold.normalX = normalX
    manifold.normalY = normalY
    manifold.overlap = overlap
    manifold.contactPoints = [
      {
        id: `${sA.id}-${sB.id},0`,
        pointX: sA.center.x + normalX * sA.radius,
        pointY: sA.center.y + normalY * sA.radius,
        overlap: overlap,
        normalImpulse: 0,
        tangentImpulse: 0,
        persistent: false
      }
    ]

    this.#vectors.deallocate(dir)

    return manifold
  }
}
