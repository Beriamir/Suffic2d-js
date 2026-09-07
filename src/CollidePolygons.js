/**
 * Uses GJK to detect overlaps.
 * EPA to compute penetration depth and collision normal.
 * Sutherland–Hodgman clipping generates the contact points.
 */

import Vector from './Vector.js'
import Pool from './Pool.js'
import EdgeClipper from './EdgeClipper.js'

export default class CollidePolygons {
	constructor() {
		this.simplex = []
		this.vectors = new Pool(() => new Vector(), 16)
		this.edgeClipper = new EdgeClipper()
	}

	collide(sA, sB, manifold = {}) {
		if (!sA.aabb.overlaps(sB.aabb)) {
			return null
		}

		const dir = this.vectors.allocate()
		const deltaX = sB.center.x - sA.center.x
		const deltaY = sB.center.y - sA.center.y

		this.vectors.at(dir).x = deltaX
		this.vectors.at(dir).y = deltaY

		if (this.vectors.at(dir).isZero()) {
			this.vectors.at(dir).set(1, 0)
		}

		this.simplex.length = 0
		this.simplex.push(
			this.getSupportPolygons(
				sA.worldVertices,
				sB.worldVertices,
				this.vectors.at(dir)
			)
		)

		this.vectors.at(dir).negate()

		while (true) {
			const support = this.getSupportPolygons(
				sA.worldVertices,
				sB.worldVertices,
				this.vectors.at(dir)
			)

			// Does it contain the origin?
			if (this.vectors.at(support).dot(this.vectors.at(dir)) < 0) {
				this.vectors.deallocate(support)
				for (let i = 0; i < this.simplex.length; ++i) {
					this.vectors.deallocate(this.simplex[i])
				}

				this.vectors.deallocate(dir)
				return null
			}

			this.simplex.push(support)

			if (this.simplex.length === 2) {
				this.handleLineSimplex(this.simplex, this.vectors.at(dir))
				continue
			}

			if (this.handleTriangleSimplex(this.simplex, this.vectors.at(dir))) {
				this.EPA(
					sA.worldVertices,
					sB.worldVertices,
					this.simplex,
					this.vectors.at(dir),
					manifold
				)
				this.edgeClipper.clip(sA.worldVertices, sB.worldVertices, manifold)

				this.vectors.deallocate(dir)
				return manifold
			}
		}
	}

	EPA(verticesA, verticesB, simplex, dir, manifold = {}) {
		while (true) {
			let minDot = Infinity
			let index = 0

			for (let i = 0; i < simplex.length; ++i) {
				const j = i < simplex.length - 1 ? i + 1 : 0

				const a = simplex[i]
				const b = simplex[j]

				let perpX = -(this.vectors.at(b).y - this.vectors.at(a).y)
				let perpY = this.vectors.at(b).x - this.vectors.at(a).x

				const mag = Math.sqrt(perpX * perpX + perpY * perpY)
				const invMag = 1 / mag

				perpX *= invMag
				perpY *= invMag

				let dot = this.vectors.at(a).x * perpX + this.vectors.at(a).y * perpY

				if (dot < 0) {
					dot = -dot
					perpX = -perpX
					perpY = -perpY
				}

				if (dot < minDot) {
					minDot = dot
					index = j
					dir.set(perpX, perpY)
				}
			}

			const support = this.getSupportPolygons(verticesA, verticesB, dir)
			const dot = this.vectors.at(support).dot(dir)

			if (dot - minDot <= 1e-4) {
				manifold.normalX = dir.x
				manifold.normalY = dir.y
				manifold.overlap = minDot

				for (let i = 0; i < simplex.length; ++i) {
					this.vectors.deallocate(simplex[i])
				}

				this.vectors.deallocate(support)
				return manifold
			}

			simplex.splice(index, 0, support)
		}
	}

	handleTriangleSimplex(simplex, dir) {
		const [c, b, a] = simplex

		const ab = this.vectors.allocate()
		const ac = this.vectors.allocate()
		const ao = this.vectors.allocate()
		const abPerp = this.vectors.allocate()
		const acPerp = this.vectors.allocate()

		this.vectors
			.at(ab)
			.set(
				this.vectors.at(b).x - this.vectors.at(a).x,
				this.vectors.at(b).y - this.vectors.at(a).y
			)
		this.vectors
			.at(ac)
			.set(
				this.vectors.at(c).x - this.vectors.at(a).x,
				this.vectors.at(c).y - this.vectors.at(a).y
			)

		this.vectors.at(ao).copy(this.vectors.at(a)).negate()

		this.tripleProduct(
			this.vectors.at(ac),
			this.vectors.at(ab),
			this.vectors.at(ab),
			this.vectors.at(abPerp)
		)
		this.tripleProduct(
			this.vectors.at(ab),
			this.vectors.at(ac),
			this.vectors.at(ac),
			this.vectors.at(acPerp)
		)

		if (this.vectors.at(abPerp).isZero()) {
			this.vectors.at(abPerp).copy(this.vectors.at(ab)).perp()
		}

		if (this.vectors.at(acPerp).isZero()) {
			this.vectors.at(acPerp).copy(this.vectors.at(ac)).perp()
		}

		if (this.vectors.at(abPerp).dot(this.vectors.at(ao)) > 0) {
			simplex.length = 2
			simplex[0] = b
			simplex[1] = a
			dir.copy(this.vectors.at(abPerp))

			this.vectors.deallocate(c)
			this.vectors.deallocate(ab)
			this.vectors.deallocate(ac)
			this.vectors.deallocate(ao)
			this.vectors.deallocate(abPerp)
			this.vectors.deallocate(acPerp)
			return false
		}

		if (this.vectors.at(acPerp).dot(this.vectors.at(ao)) > 0) {
			simplex.length = 2
			simplex[0] = c
			simplex[1] = a
			dir.copy(this.vectors.at(acPerp))

			this.vectors.deallocate(b)
			this.vectors.deallocate(ab)
			this.vectors.deallocate(ac)
			this.vectors.deallocate(ao)
			this.vectors.deallocate(abPerp)
			this.vectors.deallocate(acPerp)
			return false
		}

		this.vectors.deallocate(ab)
		this.vectors.deallocate(ac)
		this.vectors.deallocate(ao)
		this.vectors.deallocate(abPerp)
		this.vectors.deallocate(acPerp)
		return true
	}

	handleLineSimplex(simplex, dir) {
		const [b, a] = simplex

		const ab = this.vectors.allocate()
		const ao = this.vectors.allocate()
		const abPerp = this.vectors.allocate()

		this.vectors
			.at(ab)
			.set(
				this.vectors.at(b).x - this.vectors.at(a).x,
				this.vectors.at(b).y - this.vectors.at(a).y
			)

		this.vectors.at(ao).copy(this.vectors.at(a)).negate()

		this.tripleProduct(
			this.vectors.at(ab),
			this.vectors.at(ao),
			this.vectors.at(ab),
			this.vectors.at(abPerp)
		)

		if (this.vectors.at(abPerp).isZero()) {
			this.vectors.at(abPerp).copy(this.vectors.at(ab)).perp()
		}

		dir.copy(this.vectors.at(abPerp))

		this.vectors.deallocate(ab)
		this.vectors.deallocate(ao)
		this.vectors.deallocate(abPerp)
	}

	tripleProduct(u, v, w, out = new Vector()) {
		const dotWU = w.dot(u)
		const dotWV = w.dot(v)

		out.x = v.x * dotWU - u.x * dotWV
		out.y = v.y * dotWU - u.y * dotWV
		return out
	}

	bestPoint(vertices, dirX, dirY) {
		let bestDot = -Infinity
		let bestInd = 0

		for (let i = 0; i < vertices.length; i += 2) {
			const dot = vertices[i] * dirX + vertices[i + 1] * dirY

			if (dot > bestDot) {
				bestDot = dot
				bestInd = i
			}
		}

		const point = this.vectors.allocate()

		this.vectors.at(point).x = vertices[bestInd]
		this.vectors.at(point).y = vertices[bestInd + 1]

		return point
	}

	getSupportPolygons(verticesA, verticesB, dir) {
		const bestA = this.bestPoint(verticesA, dir.x, dir.y)
		const bestB = this.bestPoint(verticesB, -dir.x, -dir.y)
		const point = this.vectors.allocate()

		this.vectors.at(point).x =
			this.vectors.at(bestA).x - this.vectors.at(bestB).x
		this.vectors.at(point).y =
			this.vectors.at(bestA).y - this.vectors.at(bestB).y

		this.vectors.deallocate(bestA)
		this.vectors.deallocate(bestB)

		return point
	}
}
