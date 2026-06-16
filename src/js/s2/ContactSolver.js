export default class ContactSolver {
  #_zeta
  #_hertz
  #_slop
  #_restitutionThreashold
  constructor(option = {}) {
    this.#_zeta = option.zeta ?? 35
    this.#_hertz = option.hertz ?? 60
    this.#_slop = option.slop ?? 0.2
    this.#_restitutionThreashold = option.restitutionThreashold ?? 1
  }
  prepare(contact, dt) {
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
    const wA = bodyA.angularVelocity
    const wB = bodyB.angularVelocity

    const tangentX = -normal.y
    const tangentY = normal.x
    const contactCount = contactPoints.length

    for (let i = 0; i < contactCount; ++i) {
      const cp = contactPoints[i]

      const raX = cp.pointX - bodyA.position.x
      const raY = cp.pointY - bodyA.position.y
      const rbX = cp.pointX - bodyB.position.x
      const rbY = cp.pointY - bodyB.position.y

      const relVelX = vB.x - rbY * wB - (vA.x - raY * wA)
      const relVelY = vB.y + rbX * wB - (vA.y + raX * wA)

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

      cp.vn = relVelX * normal.x + relVelY * normal.y

      cp.rnA = rnA
      cp.rnB = rnB
      cp.rtA = rtA
      cp.rtB = rtB

      cp.effNormalMass = kn !== 0 ? 1 / kn : 0
      cp.effTangentMass = kt !== 0 ? 1 / kt : 0

      cp.normalImpulse = 0
      cp.tangentImpulse = 0
      cp.persistent = false

      const omega = 2 * Math.PI * this.#_hertz
      const a1 = 2 * this.#_zeta + omega * dt
      const a2 = dt * omega * a1
      const a3 = 1 / (1 + a2)

      cp.biasCoeff = omega / a1
      cp.massCoeff = a2 * a3
      cp.impulseCoeff = a3

      contact.manifold.contactCount = contactCount
    }

    if (contactCount == 2) {
      const cp1 = contactPoints[0]
      const cp2 = contactPoints[1]

      const ra1X = cp1.raX
      const ra1Y = cp1.raY
      const ra2X = cp2.raX
      const ra2Y = cp2.raY

      const rb1X = cp1.rbX
      const rb1Y = cp1.rbY
      const rb2X = cp2.rbX
      const rb2Y = cp2.rbY

      const rn1A = cp1.rnA
      const rn1B = cp1.rnB
      const rn2A = cp2.rnA
      const rn2B = cp2.rnB

      const kn11 = mA + mB + rn1A * rn1A * iA + rn1B * rn1B * iB
      const kn22 = mA + mB + rn2A * rn2A * iA + rn2B * rn2B * iB
      const kn12 = mA + mB + rn1A * rn2A * iA + rn1B * rn2B * iB

      const kMaxConditionNumber = 1000
      const det = kn11 * kn22 - kn12 * kn12

      contact.manifold.kn = { a: 0, b: 0, c: 0, d: 0 }
      contact.manifold.invkn = { a: 0, b: 0, c: 0, d: 0 }

      if (kn11 * kn11 < kMaxConditionNumber * det) {
        contact.manifold.kn.a = kn11
        contact.manifold.kn.b = kn12
        contact.manifold.kn.c = kn12
        contact.manifold.kn.d = kn22

        const invDet = 1 / det
        contact.manifold.invkn.a = kn22 * invDet
        contact.manifold.invkn.b = -kn12 * invDet
        contact.manifold.invkn.c = -kn12 * invDet
        contact.manifold.invkn.d = kn11 * invDet
      } else {
        const cp = cp1.overlap > cp2.overlap ? cp1 : cp2

        contactPoints.length = 1
        contactPoints[0] = cp
        contact.manifold.contactCount = 1
      }
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
  solve(contact, invH, useBias = false) {
    const {
      bodyA,
      bodyB,
      manifold: { normal, contactPoints, contactCount, kn, invkn }
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
    const friction = Math.min(bodyA.friction, bodyB.friction)

    if (contactCount == 1) {
      const cp = contactPoints[0]

      const relVelX = vB.x - cp.rbY * wB - (vA.x - cp.raY * wA)
      const relVelY = vB.y + cp.rbX * wB - (vA.y + cp.raX * wA)
      const vn = relVelX * normal.x + relVelY * normal.y

      let bias = 0
      let massScale = 1
      let impulseScale = 0

      if (useBias) {
        bias = Math.max(cp.overlap - this.#_slop, 0) * cp.biasCoeff
        massScale = cp.massCoeff
        impulseScale = cp.impulseCoeff
      }

      let restitutionBias = 0

      if (cp.vn < -this.#_restitutionThreashold) {
        restitutionBias = -restitution * cp.vn
      }

      const velBias = Math.max(bias, restitutionBias)
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
    } else if (contactCount == 2) {
      // Block
      const cp1 = contactPoints[0]
      const cp2 = contactPoints[1]

      // v + (w x r)
      const rv1X = vB.x - cp1.rbY * wB - (vA.x - cp1.raY * wA)
      const rv1Y = vB.y + cp1.rbX * wB - (vA.y + cp1.raX * wA)
      const rv2X = vB.x - cp2.rbY * wB - (vA.x - cp2.raY * wA)
      const rv2Y = vB.y + cp2.rbX * wB - (vA.y + cp2.raX * wA)

      let vn1 = rv1X * normal.x + rv1Y * normal.y
      let vn2 = rv2X * normal.x + rv2Y * normal.y

      let bias1 = 0
      let massScale1 = 1
      let impulseScale1 = 0

      let bias2 = 0
      let massScale2 = 1
      let impulseScale2 = 0

      if (useBias) {
        bias1 = Math.max(cp1.overlap - this.#_slop, 0) * cp1.biasCoeff
        massScale1 = cp1.massCoeff
        impulseScale1 = cp1.impulseCoeff

        bias2 = Math.max(cp2.overlap - this.#_slop, 0) * cp2.biasCoeff
        massScale2 = cp2.massCoeff
        impulseScale2 = cp2.impulseCoeff
      }

      let restitutionBias1 = 0
      let restitutionBias2 = 0

      if (cp1.vn < -this.#_restitutionThreashold) {
        restitutionBias1 = -restitution * cp1.vn
      }

      if (cp2.vn < -this.#_restitutionThreashold) {
        restitutionBias2 = -restitution * cp2.vn
      }

      const vBias1 = Math.max(bias1, restitutionBias1)
      const vBias2 = Math.max(bias2, restitutionBias2)

      // Compute right hand side
      let bX = vn1 - vBias1
      let bY = vn2 - vBias2

      // Old impulse
      const aX = cp1.normalImpulse
      const aY = cp2.normalImpulse

      bX -= kn.a * aX + kn.b * aY
      bY -= kn.c * aX + kn.d * aY

      while (true) {
        // New impulse
        let xX = -(invkn.a * bX + invkn.b * bY)
        let xY = -(invkn.c * bX + invkn.d * bY)

        // Case 1
        // Both points active
        if (xX >= 0 && xY >= 0) {
          // Incremental
          const dX = xX - aX
          const dY = xY - aY

          // Apply
          const P1X = dX * normal.x
          const P1Y = dX * normal.y
          const P2X = dY * normal.x
          const P2Y = dY * normal.y

          vA.x -= (P1X + P2X) * mA
          vA.y -= (P1Y + P2Y) * mA
          vB.x += (P1X + P2X) * mB
          vB.y += (P1Y + P2Y) * mB
          wA -=
            (cp1.raX * P1Y - cp1.raY * P1X + (cp2.raX * P2Y - cp2.raY * P2X)) *
            iA
          wB +=
            (cp1.rbX * P1Y - cp1.rbY * P1X + (cp2.rbX * P2Y - cp2.rbY * P2X)) *
            iB

          // Accumulate
          cp1.normalImpulse = xX
          cp2.normalImpulse = xY

          break
        }

        // Case 2
        // Point 1 active
        // Point 2 inactive
        xX = -cp1.effNormalMass * bX
        xY = 0
        vn1 = 0
        vn2 = kn.b * xX + bY

        if (xX >= 0 && vn2 >= 0) {
          // Incremental
          const dX = xX - aX
          const dY = xY - aY

          // Apply
          const P1X = dX * normal.x
          const P1Y = dX * normal.y
          const P2X = dY * normal.x
          const P2Y = dY * normal.y

          vA.x -= (P1X + P2X) * mA
          vA.y -= (P1Y + P2Y) * mA
          vB.x += (P1X + P2X) * mB
          vB.y += (P1Y + P2Y) * mB
          wA -=
            (cp1.raX * P1Y - cp1.raY * P1X + (cp2.raX * P2Y - cp2.raY * P2X)) *
            iA
          wB +=
            (cp1.rbX * P1Y - cp1.rbY * P1X + (cp2.rbX * P2Y - cp2.rbY * P2X)) *
            iB

          // Accumulate
          cp1.normalImpulse = xX
          cp2.normalImpulse = xY

          break
        }

        // Case 3
        // Pont 1 inactive
        // Pont 2 active
        xX = 0
        xY = -cp2.effNormalMass * bY
        vn1 = kn.c * xY + bX
        vn2 = 0

        if (xY >= 0 && vn1 >= 0) {
          // Incremental
          const dX = xX - aX
          const dY = xY - aY

          // Apply
          const P1X = dX * normal.x
          const P1Y = dX * normal.y
          const P2X = dY * normal.x
          const P2Y = dY * normal.y

          vA.x -= (P1X + P2X) * mA
          vA.y -= (P1Y + P2Y) * mA
          vB.x += (P1X + P2X) * mB
          vB.y += (P1Y + P2Y) * mB
          wA -=
            (cp1.raX * P1Y - cp1.raY * P1X + (cp2.raX * P2Y - cp2.raY * P2X)) *
            iA
          wB +=
            (cp1.rbX * P1Y - cp1.rbY * P1X + (cp2.rbX * P2Y - cp2.rbY * P2X)) *
            iB

          // Accumulate
          cp1.normalImpulse = xX
          cp2.normalImpulse = xY

          break
        }

        // Case 4
        // Both points inactive
        xX = 0
        xY = 0
        vn1 = bX
        vn2 = bY

        if (vn1 >= 0 && vn2 >= 0) {
          // Incremental
          const dX = xX - aX
          const dY = xY - aY

          // Apply
          const P1X = dX * normal.x
          const P1Y = dX * normal.y
          const P2X = dY * normal.x
          const P2Y = dY * normal.y

          vA.x -= (P1X + P2X) * mA
          vA.y -= (P1Y + P2Y) * mA
          vB.x += (P1X + P2X) * mB
          vB.y += (P1Y + P2Y) * mB
          wA -=
            (cp1.raX * P1Y - cp1.raY * P1X + (cp2.raX * P2Y - cp2.raY * P2X)) *
            iA
          wB +=
            (cp1.rbX * P1Y - cp1.rbY * P1X + (cp2.rbX * P2Y - cp2.rbY * P2X)) *
            iB

          // Accumulate
          cp1.normalImpulse = xX
          cp2.normalImpulse = xY

          break
        }

        break
      }
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
