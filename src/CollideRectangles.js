import Pool from './Pool.js'
import EdgeClipper from './EdgeClipper.js'

export default class CollideRectangles {
	constructor() {
		this.projA = {}
		this.projB = {}
		this.edgeClipper = new EdgeClipper()
	}

	collide(sA, sB, manifold = {}) {
		if (!sA.aabb.overlaps(sB.aabb)) {
			return null
		}

		manifold.normalX = 0
		manifold.normalY = 0
		manifold.overlap = Infinity

		for (let i = 0; i < sA.worldAxes.length; i += 2) {
			const mtv = this.getMTV(
				sA.worldVertices,
				sB.worldVertices,
				sA.worldAxes[i],
				sA.worldAxes[i + 1],
				manifold
			)

			if (!mtv) {
				return null
			}
		}

		for (let i = 0; i < sB.worldAxes.length; i += 2) {
			const mtv = this.getMTV(
				sA.worldVertices,
				sB.worldVertices,
				sB.worldAxes[i],
				sB.worldAxes[i + 1],
				manifold
			)

			if (!mtv) {
				return null
			}
		}

		const dirX = sB.center.x - sA.center.x
		const dirY = sB.center.y - sA.center.y
		const normalX = manifold.normalX
		const normalY = manifold.normalY

		if (dirX * normalX + dirY * normalY < 0) {
			manifold.normalX = -normalX
			manifold.normalY = -normalY
		}

		return this.edgeClipper.clip(sA.worldVertices, sB.worldVertices, manifold)
	}

	getMTV(verticesA, verticesB, axisX, axisY, mtv = {}) {
		const projA = this.projVertices(verticesA, axisX, axisY, this.projA)
		const projB = this.projVertices(verticesB, axisX, axisY, this.projB)

		if (projA.min > projB.max || projB.min > projA.max) {
			return null
		}

		const minOverlap = Math.min(projA.max - projB.min, projB.max - projA.min)

		if (minOverlap < mtv.overlap) {
			mtv.normalX = axisX
			mtv.normalY = axisY
			mtv.overlap = minOverlap
		}

		return mtv
	}

	projVertices(vertices, dx, dy, out = {}) {
		out.min = Infinity
		out.max = -Infinity

		for (let i = 0; i < vertices.length; i += 2) {
			const proj = vertices[i] * dx + vertices[i + 1] * dy

			if (proj < out.min) out.min = proj
			if (proj > out.max) out.max = proj
		}

		return out
	}
}
