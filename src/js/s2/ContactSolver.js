export default class ContactSolver {
  constructor() {}

  prepare(contact) {
    const {
      bodyA,
      bodyB,
      manifold: { normal, contactPoints }
    } = contact

    const mA = bodyA.invMass
    const mB = bodyB.invMass
    const iA = bodyA.invInertia
    const iB = bodyB.invInertia

    const tangentX = -normal.y
    const tangentY = normal.x

    for (let i = 0; i < contactPoints.length; ++i) {
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

      cp.raX = raX
      cp.raY = raY
      cp.rbX = rbX
      cp.rbY = rbY

      cp.rnA = rnA
      cp.rnB = rnB
      cp.rtA = rtA
      cp.rtB = rtB

      cp.effNormalMass = kn !== 0 ? 1 / kn : 0
      cp.effTangentMass = kt !== 0 ? 1 / kt : 0

      cp.normalImpulse = 0
      cp.tangentImpulse = 0
      cp.persistent = false

      // Should we use soft constraint?
      // const zeta = 1
      // const hertz = 5
      // const omega = 2 * Math.PI * hertz
      // const a1 = 2 * zeta + omega * dt
      // const a2 = dt * omega * a1
      // const a3 = 1 / (1 + a2)

      // cp.biasCoeff = omega / a1
      // cp.massCoeff = a2 * a3
      // cp.impulseCoeff = a3
    }
  }

  warmStart(contact) {
    const {
      bodyA,
      bodyB,
      manifold: { normal, contactPoints }
    } = contact

    const mA = bodyA.invMass
    const mB = bodyB.invMass
    const iA = bodyA.invInertia
    const iB = bodyB.invInertia

    const tangentX = -normal.y
    const tangentY = normal.x

    for (let i = 0; i < contactPoints.length; ++i) {
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

  solve(contact, invH, useBias = false) {
    const {
      bodyA,
      bodyB,
      manifold: { normal, contactPoints }
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

    const slop = 0.2
    const beta = 0.1
    const maxBaumgarte = 100
    const restitutionThreashold = 1

    const restitution =
      bodyA.restitution < bodyB.restitution
        ? bodyA.restitution
        : bodyB.restitution
    const friction =
      bodyA.friction < bodyB.friction ? bodyA.friction : bodyB.friction

    for (let i = 0; i < contactPoints.length; ++i) {
      const cp = contactPoints[i]

      const relVelX = vB.x - cp.rbY * wB - (vA.x - cp.raY * wA)
      const relVelY = vB.y + cp.rbX * wB - (vA.y + cp.raX * wA)
      const vn = relVelX * normal.x + relVelY * normal.y

      let bias = 0

      if (useBias) {
        bias = Math.max(-cp.overlap - slop, 0) * beta * invH

        if (bias > maxBaumgarte) {
          bias = maxBaumgarte
        }
      }

      bias += restitution * Math.max(vn - restitutionThreashold, 0)

      let impulse = (-vn + bias) * cp.effNormalMass
      const oldImpulse = cp.normalImpulse
      const newImpulse = Math.max(oldImpulse + impulse, 0)

      cp.normalImpulse = newImpulse
      impulse = newImpulse - oldImpulse

      vA.subMulV(normal, impulse * mA)
      vB.addMulV(normal, impulse * mB)
      wA -= cp.rnA * impulse * iA
      wB += cp.rnB * impulse * iB
    }

    for (let i = 0; i < contactPoints.length; ++i) {
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

    bodyA.linearVelocity.copy(vA)
    bodyB.linearVelocity.copy(vB)
    bodyA.angularVelocity = wA
    bodyB.angularVelocity = wB
  }
}
