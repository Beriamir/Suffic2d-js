export default class ContactSolver {
  constructor(option = {}) {}

  prepare(contact, dt) {
    const { bodyA, bodyB, normalX, normalY, contactPoints } = contact

    const mA = bodyA.invMass
    const mB = bodyB.invMass
    const iA = bodyA.invInertia
    const iB = bodyB.invInertia

    const vA = bodyA.linearVelocity
    const vB = bodyB.linearVelocity
    const wA = bodyA.angularVelocity
    const wB = bodyB.angularVelocity

    const restitution = Math.max(bodyA.restitution, bodyB.restitution)
    contact.friction = Math.max(bodyA.friction, bodyB.friction)

    const tangentX = (contact.tangentX = -normalY)
    const tangentY = (contact.tangentY = normalX)
    const contactCount = (contact.contactCount = contactPoints.length)

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

      const relVelX = vB.x - rbY * wB - (vA.x - raY * wA)
      const relVelY = vB.y + rbX * wB - (vA.y + raX * wA)
      const vn = relVelX * normalX + relVelY * normalY

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

      cp.vn = vn

      cp.rnA = rnA
      cp.rnB = rnB
      cp.rtA = rtA
      cp.rtB = rtB

      cp.effNormalMass = kn == 0 ? 0 : 1 / kn
      cp.effTangentMass = kt == 0 ? 0 : 1 / kt

      cp.normalImpulse = 0
      cp.tangentImpulse = 0
      cp.persistent = false

      const biasSlop = 0.01 // meter
      const biasBeta = mA == 0 || mB == 0 ? 0.3 : 0.1 // 0 -> 1

      cp.velRestitution = -restitution * vn
      cp.velBias = Math.max(cp.overlap - biasSlop, 0) * (biasBeta / dt)
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

      // Ensure a reasonable condition number.
      const kMaxConditionNumber = 1000
      const det = kn11 * kn22 - kn12 * kn12

      if (kn11 * kn11 < kMaxConditionNumber * det) {
        // K is safe to invert.
        contact.knA = kn11
        contact.knB = kn12
        contact.knC = kn12
        contact.knD = kn22

        const invDet = 1 / det
        contact.invknA = kn22 * invDet
        contact.invknB = -kn12 * invDet
        contact.invknC = -kn12 * invDet
        contact.invknD = kn11 * invDet
      } else {
        // The constraints are redundant, just use one.
        contactPoints.length = 1
        contact.contactCount = 1
        contactPoints[0] = cp1.overlap > cp2.overlap ? cp1 : cp2
      }
    }
  }

  warmStart(newContact, oldContactPoints) {
    if (!oldContactPoints) {
      return
    }

    const {
      bodyA,
      bodyB,
      normalX,
      normalY,
      tangentX,
      tangentY,
      contactPoints,
      contactCount
    } = newContact

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
    const {
      bodyA,
      bodyB,
      normalX,
      normalY,
      tangentX,
      tangentY,
      contactPoints,
      contactCount,
      friction
    } = contact

    const mA = bodyA.invMass
    const mB = bodyB.invMass
    const iA = bodyA.invInertia
    const iB = bodyB.invInertia

    const vA = bodyA.linearVelocity
    const vB = bodyB.linearVelocity
    let wA = bodyA.angularVelocity
    let wB = bodyB.angularVelocity

    if (contactCount == 1) {
      const cp = contactPoints[0]

      const relVelX = vB.x - cp.rbY * wB - (vA.x - cp.raY * wA)
      const relVelY = vB.y + cp.rbX * wB - (vA.y + cp.raX * wA)
      const vn = relVelX * normalX + relVelY * normalY

      let velBias = 0
      let velRestitution = 0

      if (useBias) {
        velBias = cp.velBias
      } else {
        if (cp.vn < 1) {
          velRestitution = cp.velRestitution
        }
      }

      let impulse = (-vn + velRestitution + velBias) * cp.effNormalMass
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
    } else if (contactCount == 2) {
      // Block
      const { knA, knB, knC, knD, invknA, invknB, invknC, invknD } = contact
      const cp1 = contactPoints[0]
      const cp2 = contactPoints[1]

      // v + (w x r)
      const rv1X = vB.x - cp1.rbY * wB - (vA.x - cp1.raY * wA)
      const rv1Y = vB.y + cp1.rbX * wB - (vA.y + cp1.raX * wA)
      const rv2X = vB.x - cp2.rbY * wB - (vA.x - cp2.raY * wA)
      const rv2Y = vB.y + cp2.rbX * wB - (vA.y + cp2.raX * wA)

      let vn1 = rv1X * normalX + rv1Y * normalY
      let vn2 = rv2X * normalX + rv2Y * normalY

      let velBias1 = 0
      let velBias2 = 0
      let velRestitution1 = 0
      let velRestitution2 = 0

      if (useBias) {
        velBias1 = cp1.velBias
        velBias2 = cp2.velBias
      } else {
        if (cp1.vn < 1) velRestitution1 = cp1.velRestitution
        if (cp2.vn < 1) velRestitution2 = cp2.velRestitution
      }

      // Compute b
      let bX = vn1 - velRestitution1 - velBias1
      let bY = vn2 - velRestitution2 - velBias2

      // Old impulse
      const aX = cp1.normalImpulse
      const aY = cp2.normalImpulse

      //  Apply old impulse
      bX -= knA * aX + knB * aY
      bY -= knC * aX + knD * aY

      while (true) {
        // New accumulated impulse
        let xX = -(invknA * bX + invknB * bY)
        let xY = -(invknC * bX + invknD * bY)

        // Case 1
        // Both points active
        if (xX >= 0 && xY >= 0) {
          // Incremental impulse
          const dX = xX - aX
          const dY = xY - aY

          // Apply
          const P1X = dX * normalX
          const P1Y = dX * normalY
          const P2X = dY * normalX
          const P2Y = dY * normalY

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

          // Store
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
          // Incremental impulse
          const dX = xX - aX
          const dY = xY - aY

          // Apply
          const P1X = dX * normalX
          const P1Y = dX * normalY
          const P2X = dY * normalX
          const P2Y = dY * normalY

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

          // Store
          cp1.normalImpulse = xX
          cp2.normalImpulse = xY

          break
        }

        // Case 3
        // Pont 1 inactive
        // Pont 2 active
        xX = 0
        xY = -cp2.effNormalMass * bY
        vn1 = knC * xY + bX
        vn2 = 0

        if (xY >= 0 && vn1 >= 0) {
          // Incremental impulse
          const dX = xX - aX
          const dY = xY - aY

          // Apply
          const P1X = dX * normalX
          const P1Y = dX * normalY
          const P2X = dY * normalX
          const P2Y = dY * normalY

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

          // Store
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
          // Incremental impulse
          const dX = xX - aX
          const dY = xY - aY

          // Apply
          const P1X = dX * normalX
          const P1Y = dX * normalY
          const P2X = dY * normalX
          const P2Y = dY * normalY

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

          // Store
          cp1.normalImpulse = xX
          cp2.normalImpulse = xY

          break
        }

        // No solution, give up. This is hit sometimes, but it doesn't seem to matter.
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
