export default class ContactSolver {
  constructor(option = {}) {
    this.zeta = option.zeta ?? 10
    this.hertz = option.hertz ?? 30
    this.baumgarteSlop = option.baumgarteSlop ?? 0.2
    this.restitutionSlop = option.restitutionSlop ?? 20
    this.enableBlock = option.enableBlock ?? false
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

    const omega = 2 * Math.PI * this.hertz
    const alpha = 2 * this.zeta + omega * dt
    const biasCoeff = omega / alpha

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
      const rtA = raX * tangentY - raY * tangentX
      const rtB = rbX * tangentY - rbY * tangentX

      const kn = mA + mB + rnA * rnA * iA + rnB * rnB * iB
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

      cp.baumgarteBias =
        Math.max(cp.overlap - this.baumgarteSlop, 0) * biasCoeff
      cp.restitutionBias = -restitution * cp.vn
    }

    if (this.enableBlock && contactCount == 2) {
      const cp1 = contactPoints[0]
      const cp2 = contactPoints[1]

      const rn1A = cp1.rnA
      const rn1B = cp1.rnB
      const rn2A = cp2.rnA
      const rn2B = cp2.rnB

      const kn11 = mA + mB + rn1A * rn1A * iA + rn1B * rn1B * iB
      const kn22 = mA + mB + rn2A * rn2A * iA + rn2B * rn2B * iB
      const kn12 = mA + mB + rn1A * rn2A * iA + rn1B * rn2B * iB

      // Ensure a reasonable condition number. - Erin
      const kMaxConditionNumber = 1000
      const det = kn11 * kn22 - kn12 * kn12

      if (kn11 * kn11 < kMaxConditionNumber * det) {
        manifold.knA = kn11
        manifold.knB = kn12
        manifold.knC = kn12
        manifold.knD = kn22

        const invDet = 1 / det
        manifold.invknA = kn22 * invDet
        manifold.invknB = -kn12 * invDet
        manifold.invknC = -kn12 * invDet
        manifold.invknD = kn11 * invDet
      } else {
        // The constraints are redundant, just use one. - Erin
        const cp = cp1.overlap > cp2.overlap ? cp1 : cp2

        contactPoints.length = 1
        contactPoints[0] = cp
        manifold.contactCount = 1
      }
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
    const { bodyA, bodyB, manifold } = contact
    const {
      normal,
      tangentX,
      tangentY,
      restitution,
      friction,
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

    if (!this.enableBlock) {
      for (let i = 0; i < contactCount; ++i) {
        const cp = contactPoints[i]

        const relVelX = vB.x - cp.rbY * wB - (vA.x - cp.raY * wA)
        const relVelY = vB.y + cp.rbX * wB - (vA.y + cp.raX * wA)
        const vn = relVelX * normal.x + relVelY * normal.y

        let baumgarteBias = 0
        let restitutionBias = 0

        if (useBias) {
          baumgarteBias = cp.baumgarteBias
        }

        if (cp.vn < -this.restitutionSlop) {
          restitutionBias = cp.restitutionBias - vn * restitution
        }

        const velBias = Math.max(baumgarteBias, restitutionBias)
        let impulse = -cp.effNormalMass * (vn - velBias)

        const oldImpulse = cp.normalImpulse
        const newImpulse = Math.max(oldImpulse + impulse, 0)

        cp.normalImpulse = newImpulse
        impulse = newImpulse - oldImpulse

        vA.subMulV(normal, impulse * mA)
        vB.addMulV(normal, impulse * mB)
        wA -= cp.rnA * impulse * iA
        wB += cp.rnB * impulse * iB
      }
    } else {
      const { knA, knB, knC, knD, invknA, invknB, invknC, invknD } = manifold

      if (contactCount == 1) {
        const cp = contactPoints[0]

        const relVelX = vB.x - cp.rbY * wB - (vA.x - cp.raY * wA)
        const relVelY = vB.y + cp.rbX * wB - (vA.y + cp.raX * wA)
        const vn = relVelX * normal.x + relVelY * normal.y

        let baumgarteBias = 0
        let restitutionBias = 0

        if (useBias) {
          baumgarteBias = cp.baumgarteBias
        }

        if (cp.vn < -this.restitutionSlop) {
          restitutionBias = cp.restitutionBias - vn * restitution
        }

        const velBias = Math.max(baumgarteBias, restitutionBias)
        let impulse = -cp.effNormalMass * (vn - velBias)

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

        let baumgarteBias1 = 0
        let baumgarteBias2 = 0

        if (useBias) {
          baumgarteBias1 = cp1.baumgarteBias
          baumgarteBias2 = cp2.baumgarteBias
        }

        let restitutionBias1 = 0
        let restitutionBias2 = 0

        if (cp1.vn < -this.restitutionSlop) {
          restitutionBias1 = cp1.restitutionBias - vn1 * restitution
        }

        if (cp2.vn < -this.restitutionSlop) {
          restitutionBias2 = cp2.restitutionBias - vn2 * restitution
        }

        const vBias1 = Math.max(baumgarteBias1, restitutionBias1)
        const vBias2 = Math.max(baumgarteBias2, restitutionBias2)

        const aX = cp1.normalImpulse
        const aY = cp2.normalImpulse

        // Compute the right hand side b
        let bX = vn1 - vBias1
        let bY = vn2 - vBias2

        bX -= knA * aX + knB * aY
        bY -= knC * aX + knD * aY

        while (true) {
          // New impulse
          let xX = -(invknA * bX + invknB * bY)
          let xY = -(invknC * bX + invknD * bY)

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
              (cp1.raX * P1Y -
                cp1.raY * P1X +
                (cp2.raX * P2Y - cp2.raY * P2X)) *
              iA
            wB +=
              (cp1.rbX * P1Y -
                cp1.rbY * P1X +
                (cp2.rbX * P2Y - cp2.rbY * P2X)) *
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
          vn2 = knB * xX + bY

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
              (cp1.raX * P1Y -
                cp1.raY * P1X +
                (cp2.raX * P2Y - cp2.raY * P2X)) *
              iA
            wB +=
              (cp1.rbX * P1Y -
                cp1.rbY * P1X +
                (cp2.rbX * P2Y - cp2.rbY * P2X)) *
              iB

            // Accumulate
            cp1.normalImpulse = xX
            cp2.normalImpulse = xY

            break
          }

          // Case 3
          // Point 1 inactive
          // Point 2 active
          xX = 0
          xY = -cp2.effNormalMass * bY
          vn1 = knC * xY + bX
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
              (cp1.raX * P1Y -
                cp1.raY * P1X +
                (cp2.raX * P2Y - cp2.raY * P2X)) *
              iA
            wB +=
              (cp1.rbX * P1Y -
                cp1.rbY * P1X +
                (cp2.rbX * P2Y - cp2.rbY * P2X)) *
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
              (cp1.raX * P1Y -
                cp1.raY * P1X +
                (cp2.raX * P2Y - cp2.raY * P2X)) *
              iA
            wB +=
              (cp1.rbX * P1Y -
                cp1.rbY * P1X +
                (cp2.rbX * P2Y - cp2.rbY * P2X)) *
              iB

            // Accumulate
            cp1.normalImpulse = xX
            cp2.normalImpulse = xY

            break
          }

          // No solution, give up. This is hit sometimes, but it doesn't seem to matter. - Erin
          break
        }
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
