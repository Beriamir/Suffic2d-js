import CollideCircleCircle from "./CollideCircleCircle.js"
import CollidePolygonCircle from "./CollidePolygonCircle.js"
import CollidePolygonPolygon from "./CollidePolygonPolygon.js"

export default class Collider {
  constructor() {
    this.collideCircleCircle = new CollideCircleCircle()
    this.collidePolygonCircle = new CollidePolygonCircle()
    this.collidePolygonPolygon = new CollidePolygonPolygon()
    this.colliders = []
    this.shapes = {
      circle: 0,
      polygon: 1
    }
    this.table = {
      circle: {
        circle: this.collideCircleCircle
      },
      polygon: {
        circle: this.collidePolygonCircle,
        polygon: this.collidePolygonPolygon
      }
    }

    this.initialize()
  }

  initialize() {
    const n = Object.keys(this.shapes).length

    for (let i = 0; i < n; ++i) {
      this.colliders[i] = new Array(n)
    }

    for (const keyA in this.table) {
      const shapeA = this.shapes[keyA]

      for (const [keyB, collider] of Object.entries(this.table[keyA])) {
        const shapeB = this.shapes[keyB]

        this.colliders[shapeA][shapeB] = collider
      }
    }
  }

  collide(bodyA, sA, bodyB, sB) {
    const shapeA = this.shapes[sA.type]
    const shapeB = this.shapes[sB.type]
    const collider = this.colliders[shapeA][shapeB]

    if (collider === undefined) {
      return null
    }

    return collider.collide(bodyA, sA, bodyB, sB)
  }
}
