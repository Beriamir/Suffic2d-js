export default class ContactSolver {
  constructor(option = {}) {}

  prepare(contact, dt) {
    const { bodyA, bodyB, manifold } = contact
    const { normalX, normalY, contactPoints } = manifold

    const mA = bodyA.invMass
    const mB = bodyB.invMass
    const iA = bodyA.invInertia
    const iB = bodyB.invInertia

    const vA = bodyA.linearVelocity
    const vB = bodyB.linearVelocity
    const wA = bodyA.angularVelocity
    const wB = bodyB.angularVelocity

    const tangentX = (manifold.tangentX = -normalY)
    const tangentY = (manifold.tangentY = normalX)
    const contactCount = (manifold.contactCount = contactPoints.length)

    // const zeta = 1 // damping
    // const hertz = mA == 0 || mB == 0 ? 60 : 30 // cycles per second
    // const omega = 2 * Math.PI * hertz // angular frequency
    // const a1 = 2 * zeta + omega * dt
    // const a2 = dt * omega * a1
    // const a3 = 1 / (1 + a2)

    // const biasCoeff = omega / a1
    // const massCoeff = a2 * a3
    // const impulseCoeff = a3

    for (let i = 0; i < contactCount; ++i) {
      const cp = contactPoints[i]

      const raX = cp.pointX - bodyA.position.x
      const raY = cp.pointY - bodyA.position.y
      const rbX = cp.pointX - bodyB.position.x
      const rbY = cp.pointY - bodyB.position.y

      const rnA = raX * normalY - raY * normalX
      const rnB = rbX * normalY - rbY * normalX
      const rtA = raX * tangentY - raY * tangentX
      const rtB = rbX * tangentY - rbY * tangentX

      const kn = mA + mB + rnA * rnA * iA + rnB * rnB * iB
      const kt = mA + mB + rtA * rtA * iA + rtB * rtB * iB

      cp.raX = raX
      cp.raY = raY
      cp.rbX = rbX
      cp.rbY = rbY

      cp.rnA = rnA
      cp.rnB = rnB
      cp.rtA = rtA
      cp.rtB = rtB

      cp.effNormalMass = kn == 0 ? 0 : 1 / kn
      cp.effTangentMass = kt == 0 ? 0 : 1 / kt

      cp.normalImpulse = 0
      cp.tangentImpulse = 0
      cp.persistent = false

      const biasSlop = 0.01
      const biasBeta = 0.2

      cp.velBias = Math.max(cp.overlap - biasSlop, 0) * (biasBeta / dt)
    }
  }

  warmStart(newContact, oldContact) {
    if (!oldContact) {
      return
    }

    const {
      bodyA,
      bodyB,
      manifold: {
        normalX,
        normalY,
        tangentX,
        tangentY,
        contactPoints,
        contactCount
      }
    } = newContact

    const oldContactPoints = oldContact.manifold.contactPoints
    const mA = bodyA.invMass
    const mB = bodyB.invMass
    const iA = bodyA.invInertia
    const iB = bodyB.invInertia

    for (let i = 0; i < contactCount; ++i) {
      const cp = contactPoints[i]

      for (const oldCp of oldContactPoints) {
        if (cp.id == oldCp.id) {
          cp.normalImpulse = oldCp.normalImpulse
          cp.tangentImpulse = oldCp.tangentImpulse
          cp.persistent = true
          break
        }
      }

      if (!cp.persistent) {
        continue
      }

      bodyA.linearVelocity.x -= normalX * cp.normalImpulse * mA
      bodyA.linearVelocity.y -= normalY * cp.normalImpulse * mA
      bodyB.linearVelocity.x += normalX * cp.normalImpulse * mB
      bodyB.linearVelocity.y += normalY * cp.normalImpulse * mB
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

  solve(contact, useBias = false) {
    const { bodyA, bodyB, manifold } = contact
    const {
      normalX,
      normalY,
      tangentX,
      tangentY,
      contactPoints,
      contactCount
    } = manifold

    const mA = bodyA.invMass
    const mB = bodyB.invMass
    const iA = bodyA.invInertia
    const iB = bodyB.invInertia

    const vA = bodyA.linearVelocity
    const vB = bodyB.linearVelocity
    let wA = bodyA.angularVelocity
    let wB = bodyB.angularVelocity

    // TODO: restitution?

    const friction = Math.max(bodyA.friction, bodyB.friction)

    for (let i = 0; i < contactCount; ++i) {
      const cp = contactPoints[i]

      const relVelX = vB.x - cp.rbY * wB - (vA.x - cp.raY * wA)
      const relVelY = vB.y + cp.rbX * wB - (vA.y + cp.raX * wA)
      const vn = relVelX * normalX + relVelY * normalY

      let velBias = 0

      if (useBias) {
        velBias = cp.velBias
      }

      let impulse = (-vn + velBias) * cp.effNormalMass
      const oldImpulse = cp.normalImpulse
      const newImpulse = Math.max(oldImpulse + impulse, 0)

      cp.normalImpulse = newImpulse
      impulse = newImpulse - oldImpulse

      vA.x -= normalX * impulse * mA
      vA.y -= normalY * impulse * mA
      vB.x += normalX * impulse * mB
      vB.y += normalY * impulse * mB
      wA -= cp.rnA * impulse * iA
      wB += cp.rnB * impulse * iB
    }

    for (let i = 0; i < contactCount; ++i) {
      const cp = contactPoints[i]

      const relVelX = vB.x - cp.rbY * wB - (vA.x - cp.raY * wA)
      const relVelY = vB.y + cp.rbX * wB - (vA.y + cp.raX * wA)
      const vt = relVelX * tangentX + relVelY * tangentY

      const lambdaLimit = friction * cp.normalImpulse
      let lambda = -vt * cp.effTangentMass

      const oldLambda = cp.tangentImpulse
      let newLambda = oldLambda + lambda

      newLambda =
        newLambda < -lambdaLimit
          ? -lambdaLimit
          : newLambda > lambdaLimit
            ? lambdaLimit
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

    bodyA.angularVelocity = wA
    bodyB.angularVelocity = wB
  }
}
