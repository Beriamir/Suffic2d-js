import Pool from './Pool.js'
import EdgeClipper from './EdgeClipper.js'

export default class CollideCapsules {
	constructor() {
		this.pointA = { x: 0, y: 0 }
		this.pointB = { x: 0, y: 0 }
		this.edgeClipper = new EdgeClipper()
	}

	collide(sA, sB, manifold = {}) {
		if (!sA.aabb.overlaps(sB.aabb)) {
			return null
		}

		const deltaX = sB.center.x - sA.center.x
		const deltaY = sB.center.y - sA.center.y
		const closestA = this.bestPoint(sA.center1, sA.center2, deltaX, deltaY)

		const pointB = this.segmentPoint(
			sB.center1,
			sB.center2,
			closestA.x,
			closestA.y,
			this.pointB
		)
		const pointA = this.segmentPoint(
			sA.center1,
			sA.center2,
			pointB.x,
			pointB.y,
			this.pointA
		)

		manifold.normalX = 0
		manifold.normalY = 0
		manifold.overlap = Infinity

		if (!this.getMTV(pointA, pointB, sA.radius + sB.radius, manifold)) {
			return null
		}

		return this.edgeClipper.clip(sA.worldVertices, sB.worldVertices, manifold)
	}

	getMTV(pointA, pointB, radiiSum, mtv = {}) {
		const deltaX = pointB.x - pointA.x
		const deltaY = pointB.y - pointA.y
		const magSq = deltaX * deltaX + deltaY * deltaY

		if (magSq == 0 || magSq > radiiSum * radiiSum) {
			return null
		}

		const distance = Math.sqrt(magSq)
		const invDistance = 1 / distance

		mtv.normalX = deltaX * invDistance
		mtv.normalY = deltaY * invDistance
		mtv.overlap = radiiSum - distance

		return mtv
	}

	segmentPoint(c1, c2, px, py, out = {}) {
		const edgeX = c2.x - c1.x
		const edgeY = c2.y - c1.y
		const deltaX = px - c1.x
		const deltaY = py - c1.y

		const edgeMagSq = edgeX * edgeX + edgeY * edgeY
		const pointProj = (deltaX * edgeX + deltaY * edgeY) / edgeMagSq
		let t = pointProj

		if (t < 0) t = 0
		else if (t > 1) t = 1

		out.x = c1.x + edgeX * t
		out.y = c1.y + edgeY * t

		return out
	}

	bestPoint(c1, c2, dx, dy) {
		let bestCenter = c1

		const c1Dot = c1.x * dx + c1.y * dy
		const c2Dot = c2.x * dx + c2.y * dy

		if (c2Dot > c1Dot) {
			bestCenter = c2
		}

		return bestCenter
	}
}
