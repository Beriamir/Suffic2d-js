import Vector from "./Vector.js"
import Pool from "./Pool.js"

export default class CollideCircleCircle {
  #simplex
  #vectors
  constructor() {
    this.#simplex = []
    this.#vectors = new Pool(() => new Vector(), 16)
  }

  collide(bodyA, sA, bodyB, sB, manifold = {}) {
    if (!sA.aabb.overlaps(sB.aabb)) {
      return null
    }

    const dir = this.#vectors.allocate()

    this.#vectors.at(dir).x = bodyB.position.x - bodyA.position.x
    this.#vectors.at(dir).y = bodyB.position.y - bodyA.position.y

    const magSq = this.#vectors.at(dir).magSq()
    const radii = sA.radius + sB.radius

    if (magSq == 0 || magSq >= radii * radii) {
      this.#vectors.deallocate(dir)

      return null
    }

    // polytope
    manifold.dirX = this.#vectors.at(dir).x
    manifold.dirY = this.#vectors.at(dir).y
    manifold.radius = radii

    const distance = Math.sqrt(magSq)
    const invDistance = 1 / distance
    const normal = Vector.scale(this.#vectors.at(dir), invDistance)
    const overlap = radii - distance

    manifold.normal = normal
    manifold.overlap = overlap
    manifold.contactPoints = [
      {
        id: `${sA.id}-${sB.id},0`,
        pointX: bodyA.position.x + normal.x * sA.radius,
        pointY: bodyA.position.y + normal.y * sA.radius,
        overlap: overlap
      }
    ]

    this.#vectors.deallocate(dir)

    return manifold
  }
}
