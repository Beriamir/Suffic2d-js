import Vector from "./Vector.js"

export default class GrabJoint {
  static #uid = 0
  constructor(targetX, targetY, body, options = {}) {
    this.id = GrabJoint.#uid++
    this.type = "GrabJoint"
    this.target = new Vector(targetX, targetY)
    this.body = body
    
    if (this.body) {
      const dx = targetX - body.position.x
      const dy = targetY - body.position.y
  
      // Local
      this.anchorX = dx * body.cos + dy * body.sin
      this.anchorY = -dx * body.sin + dy * body.cos
    }

    this.damping = options.damping ?? 0.3
    this.stiffness = options.stiffness ?? 0.1
    this.maxDistance = options.maxDistance ?? 0.0
    this.invDt = options.invDt ?? 60
    this.normalImpulse = 0
  }
  
  set(x, y, body) {
    const target = this.target.set(x, y)
  
    if (this.body && this.key) {
      for (let i = 0; i < this.body.jointKeys.length; ++i) {
        if (this.body.jointKeys[i] == this.key) {
          this.body.jointKeys[i] = this.body.jointKeys[this.body.jointKeys.length - 1]
          this.body.jointKeys.pop()
          --i
        }
      }
    }
    
    if (!body) {
      body = this.body
    }
    
    if (!body) {
      return null
    }
    
    const dx = target.x - body.position.x
    const dy = target.y - body.position.y

    // Local
    this.anchorX = dx * body.cos + dy * body.sin
    this.anchorY = -dx * body.sin + dy * body.cos
    this.body = body
  }
  
  move(dx, dy) {
    this.target.x += dx
    this.target.y += dy
  }

  prepare() {
    const { body, target, maxDistance } = this

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

    if (dist >= 1e-6) {
      normalX = dx / dist
      normalY = dy / dist
    }

    const rnA = rAX * normalY - rAY * normalX
    const kn = mA + rnA * rnA * iA

    this.rAX = rAX
    this.rAY = rAY

    this.normalX = normalX
    this.normalY = normalY

    this.rnA = rnA
    this.effNormalMass = kn == 0 ? 0 : 1 / kn

    this.C = (maxDistance - dist) * (this.stiffness * this.invDt)
  }

  warmStart() {
    const {
      body,
      normalX,
      normalY,
      rnA,
      normalImpulse
    } = this

    const mA = body.invMass
    const iA = body.invInertia

    body.linearVelocity.x -= normalX * normalImpulse * mA
    body.linearVelocity.y -= normalY * normalImpulse * mA
    body.angularVelocity -= rnA * normalImpulse * iA
  }

  solve(useBias = false) {
    const {
      body,
      normalX,
      normalY,
      rnA,
      effNormalMass
    } = this

    const mA = body.invMass
    const iA = body.invInertia
    const vA = body.linearVelocity
    let wA = body.angularVelocity

    const relVelX = -(vA.x - this.rAY * wA)
    const relVelY = -(vA.y + this.rAX * wA)
    const vn = relVelX * normalX + relVelY * normalY

    const bias = useBias ? this.C : 0

    let impulse = (-this.damping * vn + bias) * effNormalMass
    const oldImpulse = this.normalImpulse
    const newImpulse = oldImpulse + impulse

    this.normalImpulse = newImpulse
    impulse = newImpulse - oldImpulse

    vA.x -= normalX * impulse * mA
    vA.y -= normalY * impulse * mA
    wA -= rnA * impulse * iA

    body.angularVelocity = wA
  }
}
