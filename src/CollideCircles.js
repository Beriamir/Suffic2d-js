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

    this.#vectors.at(dir).x = sB.center.x - sA.center.x
    this.#vectors.at(dir).y = sB.center.y - sA.center.y

    const magSq = this.#vectors.at(dir).magSq()
    const radii = sA.radius + sB.radius

    if (magSq == 0 || magSq >= radii * radii) {
      this.#vectors.deallocate(dir)

      return null
    }

    const distance = Math.sqrt(magSq)
    const invDistance = 1 / distance
    const normalX = this.#vectors.at(dir).x * invDistance
    const normalY = this.#vectors.at(dir).y * invDistance
    const overlap = radii - distance

    manifold.normalX = normalX
    manifold.normalY = normalY
    manifold.overlap = overlap
    manifold.contactPoints = [
      {
        id: `${sA.id}-${sB.id},0`,
        pointX: sA.center.x + normalX * sA.radius,
        pointY: sA.center.y + normalY * sA.radius,
        overlap: overlap
      }
    ]

    this.#vectors.deallocate(dir)

    return manifold
  }
}
