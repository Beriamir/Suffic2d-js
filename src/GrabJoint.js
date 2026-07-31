import Vector from "./Vector.js"

export default class GrabJoint {
  constructor(body, targetX, targetY, options = {}) {
    this.type = "GrabJoint"
    this.body = body

    this.target = new Vector(targetX, targetY)

    this.length = options.length ?? 0.0
    this.hertz = options.hertz ?? 1
    this.zeta = options.zeta ?? 1
    this.friction = options.friction ?? 0

    const dx = targetX - body.position.x
    const dy = targetY - body.position.y

    // Local anchor
    this.anchorX = dx * body.cos + dy * body.sin
    this.anchorY = -dx * body.sin + dy * body.cos

    this.normalImpulse = 0
    this.tangentImpulse = 0
  }

  prepare(dt) {
    const { body, target, length } = this

    const mA = body.invMass
    const iA = body.invInertia
    const cos = body.cos
    const sin = body.sin

    const rAX = this.anchorX * cos - this.anchorY * sin
    const rAY = this.anchorX * sin + this.anchorY * cos

    const pointX = body.position.x + rAX
    const pointY = body.position.y + rAY

    const dx = target.x - pointX
    const dy = target.y - pointY
    const dist = Math.sqrt(dx * dx + dy * dy)

    let normalX = 0
    let normalY = 0

    if (dist > 1e-6) {
      normalX = dx / dist
      normalY = dy / dist
    }

    const tangentX = -normalY
    const tangentY = normalX

    const rnA = rAX * normalY - rAY * normalX
    const rtA = rAX * tangentY - rAY * tangentX
    const kn = mA + rnA * rnA * iA
    const kt = mA + rtA * rtA * iA

    this.rAX = rAX
    this.rAY = rAY

    this.normalX = normalX
    this.normalY = normalY
    this.tangentX = tangentX
    this.tangentY = tangentY

    this.rnA = rnA
    this.rtA = rtA
    this.effNormalMass = kn === 0 ? 0 : 1 / kn
    this.effTangentMass = kt === 0 ? 0 : 1 / kt

    this.C = length - dist

    const zeta = this.zeta
    const hertz = this.hertz
    const omega = 2 * Math.PI * hertz

    const a1 = 2 * zeta + dt * omega
    const a2 = dt * omega * a1
    const a3 = 1 / (1 + a2)

    this.biasCoeff = omega / a1
    this.massCoeff = a2 * a3
    this.impulseCoeff = a3
  }

  warmStart() {
    const {
      body,
      normalX,
      normalY,
      tangentX,
      tangentY,
      rnA,
      rtA,
      normalImpulse,
      tangentImpulse
    } = this

    const mA = body.invMass
    const iA = body.invInertia

    body.linearVelocity.x += normalX * normalImpulse * mA
    body.linearVelocity.y += normalY * normalImpulse * mA
    body.angularVelocity += rnA * normalImpulse * iA

    body.linearVelocity.x += tangentX * tangentImpulse * mA
    body.linearVelocity.y += tangentY * tangentImpulse * mA
    body.angularVelocity += rtA * tangentImpulse * iA
  }

  solve(useBias = false) {
    const {
      body,
      normalX,
      normalY,
      tangentX,
      tangentY,
      rnA,
      rtA,
      effNormalMass,
      effTangentMass
    } = this

    const mA = body.invMass
    const iA = body.invInertia

    const vA = body.linearVelocity
    let wA = body.angularVelocity

    let relVelX = vA.x - this.rAY * wA
    let relVelY = vA.y + this.rAX * wA

    const vn = relVelX * normalX + relVelY * normalY

    let bias = 0
    let massScale = 1
    let impulseScale = 0

    if (useBias) {
      bias = this.biasCoeff * this.C
      massScale = this.massCoeff
      impulseScale = this.impulseCoeff
    }

    let impulse =
      -effNormalMass * massScale * (vn + bias) -
      impulseScale * this.normalImpulse

    const oldImpulse = this.normalImpulse
    const newImpulse = oldImpulse + impulse

    this.normalImpulse = newImpulse
    impulse = newImpulse - oldImpulse

    vA.x += normalX * impulse * mA
    vA.y += normalY * impulse * mA
    wA += rnA * impulse * iA

    // Apply friction
    relVelX = vA.x - this.rAY * wA
    relVelY = vA.y + this.rAX * wA

    const vt = relVelX * tangentX + relVelY * tangentY

    const lambdaLimit = this.friction * this.normalImpulse
    let lambda = -vt * this.effTangentMass

    const oldLambda = this.tangentImpulse
    let newLambda = oldLambda + lambda

    newLambda =
      newLambda < -lambdaLimit
        ? -lambdaLimit
        : newLambda > lambdaLimit
          ? lambdaLimit
          : newLambda

    this.tangentImpulse = newLambda
    lambda = newLambda - oldLambda

    vA.x += tangentX * lambda * mA
    vA.y += tangentY * lambda * mA
    wA += rtA * lambda * iA

    body.angularVelocity = wA
  }
}
