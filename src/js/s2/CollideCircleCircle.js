import Vector from "./Vector.js"
import Pool from "./Pool.js"

export default class CollideCircleCircle {
  #simplex
  #vectors
  constructor() {
    this.#simplex = []
    this.#vectors = new Pool(() => new Vector(), 16)
  }

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
    const normal = Vector.scale(this.#vectors.at(dir), invDistance)
    const overlap = radii - distance

    manifold.normal = normal
    manifold.overlap = overlap
    manifold.contactPoints = [
      {
        id: `${sA.id}-${sB.id},0`,
        pointX: sA.center.x + normal.x * sA.radius,
        pointY: sA.center.y + normal.y * sA.radius,
        overlap: overlap
      }
    ]

    this.#vectors.deallocate(dir)

    return manifold
  }
}
