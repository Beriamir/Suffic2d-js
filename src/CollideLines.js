export default class CollideLines {
	constructor() {}

	collide(sA, sB, manifold = {}) {
		if (!sA.aabb.overlaps(sB.aabb)) {
			return null
		}

		const aEdgeX = sA.center2.x - sA.center1.x
		const aEdgeY = sA.center2.y - sA.center1.y
		const bEdgeX = sB.center2.x - sB.center1.x
		const bEdgeY = sB.center2.y - sB.center1.y
		const ab1DeltaX = sB.center1.x - sA.center1.x
		const ab1DeltaY = sB.center1.y - sA.center1.y

		const denom = aEdgeX * bEdgeY - aEdgeY * bEdgeX

		if (Math.abs(denom) < 1e-6) {
			return null
		}

		const t = (ab1DeltaX * bEdgeY - ab1DeltaY * bEdgeX) / denom
		const u = (ab1DeltaX * aEdgeY - ab1DeltaY * aEdgeX) / denom

		if (t <= 0 || t >= 1 || u <= 0 || u >= 1) {
			return null
		}

		const pointX = sA.center1.x + aEdgeX * t
		const pointY = sA.center1.y + aEdgeY * t

		const aPerpX = -aEdgeY
		const aPerpY = aEdgeX
		const mag = Math.sqrt(aPerpX * aPerpX + aPerpY * aPerpY)

		if (mag == 0) {
			return null
		}

		const deltaX = sB.center.x - sA.center.x
		const deltaY = sB.center.y - sA.center.y
		let normalX = aPerpX / mag
		let normalY = aPerpY / mag

		if (deltaX * normalX + deltaY * normalY < 0) {
			normalX *= -1
			normalY *= -1
		}

		const clippingDot = sA.center.x * normalX + sA.center.y * normalY
		const dot0 = sB.center1.x * normalX + sB.center1.y * normalY
		const dot1 = sB.center2.x * normalX + sB.center2.y * normalY
		let overlap = 0

		if (dot0 < dot1) {
			overlap = clippingDot - dot0
		} else {
			overlap = clippingDot - dot1
		}

		manifold.normalX = normalX
		manifold.normalY = normalY
		manifold.overlap = overlap
		manifold.contactCount = 1
		manifold.contactPoints = [
			{
				id: `${sA.id}-${sB.id},0`,
				pointX,
				pointY,
				overlap,
				normalImpulse: 0,
				tangentImpulse: 0,
				persistent: false
			}
		]

		return manifold
	}
}
