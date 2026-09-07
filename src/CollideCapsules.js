import Pool from './Pool.js'

export default class CollideCapsules {
	constructor() {
		this.arrays = new Pool(() => [], 16)
		this.pointA = { x: 0, y: 0 }
		this.pointB = { x: 0, y: 0 }
		this.ref = { id: 0, edge: [] }
		this.inc = { id: 0, edge: [] }
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
				id: `${ref.id}-${inc.id},${i >> 1}`,
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
			out.edge.push(prevX, prevY, bestX, bestY)
			out.id = prevI >> 1
		} else {
			out.edge.push(bestX, bestY, nextX, nextY)
		}

		return out
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
