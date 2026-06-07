import Vector from './Vector.js'

export default class ContactSolver {
  constructor(options = {}) {}

  prepare(contact) {
    const {
      bodyA,
      bodyB,
      manifold: { normal, contactPoints, contactCount }
    } = contact

    const mA = bodyA.invMass
    const mB = bodyB.invMass
    const iA = bodyA.invInertia
    const iB = bodyB.invInertia

    const vA = bodyA.linearVelocity
    const vB = bodyB.linearVelocity
    const wA = bodyA.angularVelocity
    const wB = bodyB.angularVelocity

    const tangentX = -normal.y
    const tangentY = normal.x

    for (let i = 0; i < contactCount; i++) {
      const cp = contactPoints[i]

      const raX = cp.pointX - bodyA.position.x
      const raY = cp.pointY - bodyA.position.y
      const rbX = cp.pointX - bodyB.position.x
      const rbY = cp.pointY - bodyB.position.y

      const rnA = normal.x * -raY + normal.y * raX
      const rnB = normal.x * -rbY + normal.y * rbX
      const kn = mA + mB + rnA * rnA * iA + rnB * rnB * iB

      const rtA = tangentX * -raY + tangentY * raX
      const rtB = tangentX * -rbY + tangentY * rbX
      const kt = mA + mB + rtA * rtA * iA + rtB * rtB * iB

      cp.rnA = rnA
      cp.rnB = rnB
      cp.effNormalMass = kn !== 0 ? 1 / kn : 0

      cp.rtA = rtA
      cp.rtB = rtB
      cp.effTangentMass = kt !== 0 ? 1 / kt : 0

      cp.raX = raX
      cp.raY = raY
      cp.rbX = rbX
      cp.rbY = rbY

      cp.normalImpulse = 0
      cp.tangentImpulse = 0

      cp.persistent = false
    }
  }

  warmStart(contact) {
    const {
      bodyA,
      bodyB,
      manifold: { normal, contactPoints, contactCount }
    } = contact

    const mA = bodyA.invMass
    const mB = bodyB.invMass
    const iA = bodyA.invInertia
    const iB = bodyB.invInertia

    const tangentX = -normal.y
    const tangentY = normal.x

    for (let i = 0; i < contactCount; i++) {
      const cp = contactPoints[i]

      if (!cp.persistent) {
        continue
      }

      bodyA.linearVelocity.subMulV(normal, cp.normalImpulse * mA)
      bodyB.linearVelocity.addMulV(normal, cp.normalImpulse * mB)
      bodyA.angularVelocity -= cp.rnA * cp.normalImpulse * iA
      bodyB.angularVelocity += cp.rnB * cp.normalImpulse * iB

      bodyA.linearVelocity.x -= tangentX * cp.tangentImpulse * mA
      bodyA.linearVelocity.y -= tangentY * cp.tangentImpulse * mA
      bodyB.linearVelocity.x += tangentX * cp.tangentImpulse * mB
      bodyB.linearVelocity.y += tangentY * cp.tangentImpulse * mB
      bodyA.angularVelocity -= cp.rtA * cp.tangentImpulse * iA
      bodyB.angularVelocity += cp.rtB * cp.tangentImpulse * iB
    }
  }

  solve(contact, dt) {
    const {
      bodyA,
      bodyB,
      manifold: { normal, contactPoints, contactCount }
    } = contact

    const mA = bodyA.invMass
    const mB = bodyB.invMass
    const iA = bodyA.invInertia
    const iB = bodyB.invInertia

    const vA = bodyA.linearVelocity
    const vB = bodyB.linearVelocity
    let wA = bodyA.angularVelocity
    let wB = bodyB.angularVelocity

    const tangentX = -normal.y
    const tangentY = normal.x

    const restitution = Math.min(bodyA.restitution, bodyB.restitution)
    const friction = Math.max(bodyA.friction, bodyB.friction)

    for (let i = 0; i < contactCount; i++) {
      const cp = contactPoints[i]

      const relVelX = vB.x - cp.rbY * wB - (vA.x - cp.raY * wA)
      const relVelY = vB.y + cp.rbX * wB - (vA.y + cp.raX * wA)
      const vn = relVelX * normal.x + relVelY * normal.y

      const slop = 0.2
      const beta = 0.3
      const maxBias = 100
      let bias = Math.max(0, cp.overlap - slop) * (beta / dt)

      if (bias > maxBias) {
        bias = maxBias
      }

      let impulse = (-(1 + restitution) * vn + bias) * cp.effNormalMass

      const oldImpulse = cp.normalImpulse
      const newImpulse = Math.max(oldImpulse + impulse, 0)

      cp.normalImpulse = newImpulse
      impulse = newImpulse - oldImpulse

      vA.subMulV(normal, impulse * mA)
      vB.addMulV(normal, impulse * mB)
      wA -= cp.rnA * impulse * iA
      wB += cp.rnB * impulse * iB
    }

    for (let i = 0; i < contactCount; i++) {
      const cp = contactPoints[i]

      const relVelX = vB.x - cp.rbY * wB - (vA.x - cp.raY * wA)
      const relVelY = vB.y + cp.rbX * wB - (vA.y + cp.raX * wA)
      const vt = relVelX * tangentX + relVelY * tangentY

      const maxLambda = friction * cp.normalImpulse
      let lambda = -vt * cp.effTangentMass

      const oldLambda = cp.tangentImpulse
      let newLambda = oldLambda + lambda

      newLambda =
        newLambda < -maxLambda
          ? -maxLambda
          : newLambda > maxLambda
            ? maxLambda
            : newLambda

      cp.tangentImpulse = newLambda
      lambda = newLambda - oldLambda

      vA.x -= tangentX * lambda * mA
      vA.y -= tangentY * lambda * mA
      vB.x += tangentX * lambda * mB
      vB.y += tangentY * lambda * mB
      wA -= cp.rtA * lambda * iA
      wB += cp.rtB * lambda * iB
    }

    bodyA.linearVelocity.copy(vA)
    bodyB.linearVelocity.copy(vB)
    bodyA.angularVelocity = wA
    bodyB.angularVelocity = wB
  }
}
