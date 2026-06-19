export default class ContactSolver {
  #_zeta
  #_hertz
  #_slop
  #_restitutionThreashold
  constructor(option = {}) {
    this.#_zeta = option.zeta ?? 40
    this.#_hertz = option.hertz ?? 60
    this.#_slop = option.slop ?? 0.2
    this.#_restitutionThreashold = option.restitutionThreashold ?? 1
  }
  prepare(contact, dt) {
    const { bodyA, bodyB, manifold } = contact
    const { normal, contactPoints } = manifold

    const mA = bodyA.invMass
    const mB = bodyB.invMass
    const iA = bodyA.invInertia
    const iB = bodyB.invInertia

    const vA = bodyA.linearVelocity
    const vB = bodyB.linearVelocity
    const wA = bodyA.angularVelocity
    const wB = bodyB.angularVelocity

    const tangentX = (manifold.tangentX = -normal.y)
    const tangentY = (manifold.tangentY = normal.x)
    const contactCount = (manifold.contactCount = contactPoints.length)
    const restitution = (manifold.restitution = Math.min(
      bodyA.restitution,
      bodyB.restitution
    ))

    const omega = 2 * Math.PI * this.#_hertz
    const a1 = 2 * this.#_zeta + omega * dt
    const a2 = dt * omega * a1
    const a3 = 1 / (1 + a2)
    const biasCoeff = omega / a1

    manifold.massCoeff = a2 * a3
    manifold.impulseCoeff = a3
    manifold.friction = Math.min(bodyA.friction, bodyB.friction)

    for (let i = 0; i < contactCount; ++i) {
      const cp = contactPoints[i]

      const raX = cp.pointX - bodyA.position.x
      const raY = cp.pointY - bodyA.position.y
      const rbX = cp.pointX - bodyB.position.x
      const rbY = cp.pointY - bodyB.position.y

      const relVelX = vB.x - rbY * wB - (vA.x - raY * wA)
      const relVelY = vB.y + rbX * wB - (vA.y + raX * wA)

      const rnA = raX * normal.y - raY * normal.x
      const rnB = rbX * normal.y - rbY * normal.x
      const kn = mA + mB + rnA * rnA * iA + rnB * rnB * iB

      const rtA = raX * tangentY - raY * tangentX
      const rtB = rbX * tangentY - rbY * tangentX
      const kt = mA + mB + rtA * rtA * iA + rtB * rtB * iB

      cp.raX = raX
      cp.raY = raY
      cp.rbX = rbX
      cp.rbY = rbY

      cp.vn = relVelX * normal.x + relVelY * normal.y

      cp.rnA = rnA
      cp.rnB = rnB
      cp.rtA = rtA
      cp.rtB = rtB

      cp.effNormalMass = kn == 0 ? 0 : 1 / kn
      cp.effTangentMass = kt == 0 ? 0 : 1 / kt

      cp.normalImpulse = 0
      cp.tangentImpulse = 0
      cp.persistent = false

      cp.baumgarteBias = Math.max(cp.overlap - this.#_slop, 0) * biasCoeff
      cp.restitutionBias = -restitution * cp.vn
    }
  }
  warmStart(contact) {
    const {
      bodyA,
      bodyB,
      manifold: { normal, tangentX, tangentY, contactPoints, contactCount }
    } = contact

    const mA = bodyA.invMass
    const mB = bodyB.invMass
    const iA = bodyA.invInertia
    const iB = bodyB.invInertia

    for (let i = 0; i < contactCount; ++i) {
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
  solve(contact, useBias = false) {
    const {
      bodyA,
      bodyB,
      manifold: {
        normal,
        tangentX,
        tangentY,
        friction,
        massCoeff,
        impulseCoeff,
        contactPoints,
        contactCount
      }
    } = contact

    const mA = bodyA.invMass
    const mB = bodyB.invMass
    const iA = bodyA.invInertia
    const iB = bodyB.invInertia

    const vA = bodyA.linearVelocity
    const vB = bodyB.linearVelocity
    let wA = bodyA.angularVelocity
    let wB = bodyB.angularVelocity

    for (let i = 0; i < contactCount; ++i) {
      const cp = contactPoints[i]

      const relVelX = vB.x - cp.rbY * wB - (vA.x - cp.raY * wA)
      const relVelY = vB.y + cp.rbX * wB - (vA.y + cp.raX * wA)
      const vn = relVelX * normal.x + relVelY * normal.y

      let restitutionBias = 0
      let baumgarteBias = 0
      let massScale = 1
      let impulseScale = 0

      if (cp.vn < -this.#_restitutionThreashold) {
        restitutionBias = cp.restitutionBias
      }

      if (useBias) {
        baumgarteBias = cp.baumgarteBias
        massScale = massCoeff
        impulseScale = impulseCoeff
      }

      const velBias = Math.max(baumgarteBias, restitutionBias)
      let impulse =
        -cp.effNormalMass * massScale * (vn - velBias) -
        cp.normalImpulse * impulseScale

      const oldImpulse = cp.normalImpulse
      const newImpulse = Math.max(oldImpulse + impulse, 0)

      cp.normalImpulse = newImpulse
      impulse = newImpulse - oldImpulse

      vA.subMulV(normal, impulse * mA)
      vB.addMulV(normal, impulse * mB)
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
