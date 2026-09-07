import CollideCircles from './CollideCircles.js'
import CollideCapsuleCircle from './CollideCapsuleCircle.js'
import CollidePolygonCircle from './CollidePolygonCircle.js'
import CollidePolygons from './CollidePolygons.js'
import CollideLines from './CollideLines.js'
import CollideRectangles from './CollideRectangles.js'
import CollideRectangleCircle from './CollideRectangleCircle.js'
import CollideCapsules from './CollideCapsules.js'

export default class Collider {
	constructor() {
		this.collideCircles = new CollideCircles()
		this.collideCapsuleCircle = new CollideCapsuleCircle()
		this.collidePolygonCircle = new CollidePolygonCircle()
		this.collidePolygons = new CollidePolygons()
		this.collideLines = new CollideLines()
		this.collideRectangles = new CollideRectangles()
		this.collideRectangleCircle = new CollideRectangleCircle()
		this.collideCapsules = new CollideCapsules()
		this.colliders = []
		this.shapes = {
			circle: 0,
			line: 1,
			capsule: 2,
			polygon: 3,
			rectangle: 4
		}
		this.table = {
			circle: {
				circle: this.collideCircles
			},
			line: {
				circle: this.collideCapsuleCircle,
				line: this.collideLines
			},
			capsule: {
				circle: this.collideCapsuleCircle,
				line: this.collidePolygons,
				capsule: this.collideCapsules
			},
			polygon: {
				circle: this.collidePolygonCircle,
				line: this.collidePolygons,
				capsule: this.collidePolygons,
				polygon: this.collidePolygons
			},
			rectangle: {
				circle: this.collideRectangleCircle,
				line: this.collidePolygons,
				capsule: this.collidePolygons,
				polygon: this.collidePolygons,
				rectangle: this.collideRectangles
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

	collide(sA, sB, manifold) {
		const shapeA = this.shapes[sA.type]
		const shapeB = this.shapes[sB.type]
		const collider = this.colliders[shapeA][shapeB]

		if (collider === undefined) {
			return null
		}

		return collider.collide(sA, sB, manifold)
	}
}
