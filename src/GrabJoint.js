import Vector from "./Vector.js"

export default class GrabJoint {
  constructor(body, targetX, targetY, option = {}) {
    this.type = "GrabJoint"
    this.body = body
    this.target = new Vector(targetX, targetY)
    this.length = option.length ?? 0.0
    this.hertz = option.hertz ?? 5
    this.zeta = option.zeta ?? 1

    const dx = targetX - body.position.x
    const dy = targetY - body.position.y

    this.localAnchorX = dx * body.cos + dy * body.sin
    this.localAnchorY = -dx * body.sin + dy * body.cos
    this.normalImpulse = 0
  }

  prepare(dt) {
    const { body, target, length } = this

    const mA = body.invMass
    const iA = body.invInertia

    const cos = body.cos
    const sin = body.sin
    const rAX = this.localAnchorX * cos - this.localAnchorY * sin
    const rAY = this.localAnchorX * sin + this.localAnchorY * cos

    const pointX = body.position.x + rAX
    const pointY = body.position.y + rAY

    const dx = target.x - pointX
    const dy = target.y - pointY
    let dist = Math.sqrt(dx * dx + dy * dy)

    let normalX = 0
    let normalY = 0

    if (dist >= 1e-9) {
      normalX = dx / dist
      normalY = dy / dist
    }

    this.rAX = rAX
    this.rAY = rAY
    this.normalX = normalX
    this.normalY = normalY

    const rnA = rAX * normalY - rAY * normalX
    const kn = mA + rnA * rnA * iA

    this.effNormalMass = kn === 0 ? 0 : 1 / kn
    this.rnA = rnA

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
    const { body, normalX, normalY, rnA, normalImpulse } = this
    const mA = body.invMass
    const iA = body.invInertia

    body.linearVelocity.x += normalX * normalImpulse * mA
    body.linearVelocity.y += normalY * normalImpulse * mA
    body.angularVelocity += rnA * normalImpulse * iA
  }

  solve(useBias = false) {
    const { body, normalX, normalY, rAX, rAY, rnA, effNormalMass } = this
    const mA = body.invMass
    const iA = body.invInertia

    const vA = body.linearVelocity
    let wA = body.angularVelocity

    const relVelX = vA.x - rAY * wA
    const relVelY = vA.y + rAX * wA
    const vn = relVelX * normalX + relVelY * normalY

    let bias = 0
    let massScale = 1
    let impulseScale = 0

    if (useBias) {
      bias = this.biasCoeff * this.C
      massScale = this.massCoeff
      impulseScale = this.impulseCoeff
    }

    const impulse =
      -effNormalMass * massScale * (vn + bias) -
      impulseScale * this.normalImpulse

    this.normalImpulse += impulse

    vA.x += normalX * impulse * mA
    vA.y += normalY * impulse * mA
    wA += rnA * impulse * iA

    body.angularVelocity = wA
  }
}
