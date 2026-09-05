import Pool from './Pool.js'

export default class CollideRectangles {
	constructor() {
		this.projA = {}
		this.projB = {}
		this.arrays = new Pool(() => [], 16)
		this.ref = { id: 0, edge: [] }
		this.inc = { id: 0, edge: [] }
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

		return this.getContactPoints(sA.worldVertices, sB.worldVertices, manifold)
	}

	getContactPoints(verticesA, verticesB, manifold) {
		const normalX = manifold.normalX
		const normalY = manifold.normalY

		const ref = this.bestEdge(verticesA, normalX, normalY, this.ref)
		const inc = this.bestEdge(verticesB, -normalX, -normalY, this.inc)

		const refDeltaX = ref.edge[2] - ref.edge[0]
		const refDeltaY = ref.edge[3] - ref.edge[1]

		const firstClipping = this.clipEdge(
			inc.edge,
			ref.edge[0],
			ref.edge[1],
			refDeltaX,
			refDeltaY,
			true
		)

		let secondClipping = firstClipping

		if (this.arrays.at(firstClipping).length > 1) {
			secondClipping = this.clipEdge(
				this.arrays.at(firstClipping),
				ref.edge[2],
				ref.edge[3],
				-refDeltaX,
				-refDeltaY,
				true
			)

			this.arrays.deallocate(firstClipping)
		}

		let finalClipping = secondClipping

		if (this.arrays.at(secondClipping).length > 1) {
			finalClipping = this.clipEdge(
				this.arrays.at(secondClipping),
				ref.edge[0],
				ref.edge[1],
				-refDeltaY,
				refDeltaX,
				false
			)

			this.arrays.deallocate(secondClipping)
		}

		manifold.contactCount = this.arrays.at(finalClipping).length >> 1
		manifold.contactPoints = []

		const dot0 = ref.edge[0] * normalX + ref.edge[1] * normalY
		const dot1 = ref.edge[2] * normalX + ref.edge[3] * normalY
		const clippingDot = Math.max(dot0, dot1)

		for (let i = 0; i < this.arrays.at(finalClipping).length; i += 2) {
			const pointX = this.arrays.at(finalClipping)[i]
			const pointY = this.arrays.at(finalClipping)[i + 1]
			const pointDot = pointX * normalX + pointY * normalY

			manifold.contactPoints.push({
				id: `${ref.id}-${inc.id}-${i >> 1}`,
				pointX,
				pointY,
				overlap: clippingDot - pointDot,
				normalImpulse: 0,
				tangentImpulse: 0,
				persistent: false
			})
		}

		this.arrays.deallocate(finalClipping)
		return manifold
	}

	clipEdge(inc, startX, startY, dirX, dirY, clip) {
		const result = this.arrays.allocate()
		const d0 = startX * dirX + startY * dirY
		const u0 = inc[0] * dirX + inc[1] * dirY - d0
		const u1 = inc[2] * dirX + inc[3] * dirY - d0

		this.arrays.at(result).length = 0

		if (u0 >= 0) {
			this.arrays.at(result).push(inc[0], inc[1])
		}

		if (u1 >= 0) {
			this.arrays.at(result).push(inc[2], inc[3])
		}

		if (clip && u0 * u1 < 0) {
			const incDeltaX = inc[2] - inc[0]
			const incDeltaY = inc[3] - inc[1]
			const t = u0 / (u0 - u1)

			const pointX = inc[0] + incDeltaX * t
			const pointY = inc[1] + incDeltaY * t

			this.arrays.at(result).push(pointX, pointY)
		}

		return result
	}

	bestEdge(vertices, dirX, dirY, out = {}) {
		let bestDot = -Infinity
		let index = 0

		for (let i = 0; i < vertices.length; i += 2) {
			const dot = vertices[i] * dirX + vertices[i + 1] * dirY

			if (dot > bestDot) {
				bestDot = dot
				index = i
			}
		}

		const n = vertices.length
		const prevI = index >= 2 ? index - 2 : index - 2 + n
		const nextI = index < n - 2 ? index + 2 : index + 2 - n

		const prevX = vertices[prevI]
		const prevY = vertices[prevI + 1]
		const bestX = vertices[index]
		const bestY = vertices[index + 1]
		const nextX = vertices[nextI]
		const nextY = vertices[nextI + 1]

		const prevDeltaX = prevX - bestX
		const prevDeltaY = prevY - bestY
		const nextDeltaX = nextX - bestX
		const nextDeltaY = nextY - bestY

		const prevDot = prevDeltaX * dirX + prevDeltaY * dirY
		const nextDot = nextDeltaX * dirX + nextDeltaY * dirY

		out.id = index >> 1
		out.edge.length = 0

		if (prevDot > nextDot) {
			out.id = prevI >> 1
			out.edge.push(prevX, prevY, bestX, bestY)
		} else {
			out.edge.push(bestX, bestY, nextX, nextY)
		}

		return out
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
