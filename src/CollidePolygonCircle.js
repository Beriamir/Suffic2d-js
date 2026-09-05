export default class CollidePolygonCircle {
	constructor() {
		this.axes = []
		this.projA = {}
		this.projB = {}
	}

	collide(sA, sB, manifold = {}) {
		if (!sA.aabb.overlaps(sB.aabb)) {
			return null
		}

		const dirX = sB.center.x - sA.center.x
		const dirY = sB.center.y - sA.center.y
		const best = this.bestPoint(sA.worldVertices, dirX, dirY)

		this.axes.length = 0
		this.axes.push(
			sB.center.x - sA.worldVertices[best],
			sB.center.y - sA.worldVertices[best + 1]
		)

		const axes = this.getAxes(sA.worldVertices, this.axes)

		manifold.normalX = 0
		manifold.normalY = 0
		manifold.overlap = Infinity

		for (let i = 0; i < axes.length; i += 2) {
			const x0 = axes[i]
			const y0 = axes[i + 1]
			const invMag = 1 / Math.sqrt(x0 * x0 + y0 * y0)

			const mtv = this.getMTV(
				sA.worldVertices,
				sB.center,
				sB.radius,
				x0 * invMag,
				y0 * invMag,
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

		manifold.contactCount = 1
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

	getAxes(vertices, axes = []) {
		const n = vertices.length

		for (let i = 0; i < n; i += 2) {
			const j = i < n - 2 ? i + 2 : 0

			const x0 = vertices[i]
			const y0 = vertices[i + 1]
			const x1 = vertices[j]
			const y1 = vertices[j + 1]

			axes.push(-(y1 - y0), x1 - x0)
		}

		return axes
	}

	bestPoint(vertices, dx, dy) {
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

	getMTV(verticesA, centerB, radiusB, axisX, axisY, mtv = {}) {
		const projA = this.projVertices(verticesA, axisX, axisY, this.projA)
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
