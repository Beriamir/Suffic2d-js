export default class CollideCapsuleCircle {
  constructor() {}

  collide(sA, sB, manifold = {}) {
    if (!sA.aabb.overlaps(sB.aabb)) {
      return null
    }

    const abX = sA.center2.x - sA.center1.x
    const abY = sA.center2.y - sA.center1.y
    const apX = sB.center.x - sA.center1.x
    const apY = sB.center.y - sA.center1.y

    const abMagSq = abX * abX + abY * abY
    const apProj = (apX * abX + apY * abY) / abMagSq
    let t = apProj

    if (t < 0) t = 0
    else if (t > 1) t = 1

    const projX = sA.center1.x + abX * t
    const projY = sA.center1.y + abY * t

    const deltaX = sB.center.x - projX
    const deltaY = sB.center.y - projY
    const magSq = deltaX * deltaX + deltaY * deltaY
    const radiiSum = sA.radius + sB.radius

    if (magSq === 0 || magSq >= radiiSum * radiiSum) {
      return null
    }

    const distance = Math.sqrt(magSq)
    const invDistance = 1 / distance
    const normalX = deltaX * invDistance
    const normalY = deltaY * invDistance
    const overlap = radiiSum - distance

    manifold.normalX = normalX
    manifold.normalY = normalY
    manifold.overlap = overlap
    manifold.contactPoints = [
      {
        id: `${sA.id}-${sB.id},0`,
        pointX: sB.center.x - normalX * sB.radius,
        pointY: sB.center.y - normalY * sB.radius,
        overlap,
        normalImpulse: 0,
        tangentImpulse: 0,
        persistent: false
      }
    ]

    return manifold
  }
}
