export default class CollideRectangleCircle {
	constructor() {
		this.projA = {}
		this.projB = {}
	}

	collide(sA, sB, manifold = {}) {
		if (!sA.aabb.overlaps(sB.aabb)) {
			return null
		}

		const dirX = sB.center.x - sA.center.x
		const dirY = sB.center.y - sA.center.y
		const best = this.#bestPoint(sA.worldVertices, dirX, dirY)

		let axisX = sB.center.x - sA.worldVertices[best]
		let axisY = sB.center.y - sA.worldVertices[best + 1]

		const invMag = 1 / Math.sqrt(axisX * axisX + axisY * axisY)

		axisX *= invMag
		axisY *= invMag

		manifold.normalX = 0
		manifold.normalY = 0
		manifold.overlap = Infinity

		if (
			!this.#getMTV(
				sA.worldVertices,
				sB.center,
				sB.radius,
				axisX,
				axisY,
				manifold
			)
		) {
			return null
		}

		for (let i = 0; i < sA.worldAxes.length; i += 2) {
			const mtv = this.#getMTV(
				sA.worldVertices,
				sB.center,
				sB.radius,
				sA.worldAxes[i],
				sA.worldAxes[i + 1],
				manifold
			)

			if (!mtv) {
				return null
			}
		}

		const normalX = manifold.normalX
		const normalY = manifold.normalY

		if (dirX * normalX + dirY * normalY < 0) {
			manifold.normalX = -normalX
			manifold.normalY = -normalY
		}

		manifold.contactPoints = [
			{
				id: `${sA.id}-${sB.id},0`,
				pointX: sB.center.x - manifold.normalX * sB.radius,
				pointY: sB.center.y - manifold.normalY * sB.radius,
				overlap: manifold.overlap,
				normalImpulse: 0,
				tangentImpulse: 0,
				persistent: false
			}
		]

		return manifold
	}

	#bestPoint(vertices, dx, dy) {
		let max = -Infinity
		let best = -1

		for (let i = 0; i < vertices.length; i += 2) {
			const proj = vertices[i] * dx + vertices[i + 1] * dy

			if (proj > max) {
				max = proj
				best = i
			}
		}

		return best
	}

	#getMTV(verticesA, centerB, radiusB, axisX, axisY, mtv = {}) {
		const projA = this.#projVertices(verticesA, axisX, axisY, this.projA)
		const projB = this.projB

		const dot = centerB.x * axisX + centerB.y * axisY

		projB.min = dot - radiusB
		projB.max = dot + radiusB

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

	#projVertices(vertices, dx, dy, out = {}) {
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
