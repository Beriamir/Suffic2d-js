import Vector from "./Vector.js"

export default class GrabJoint {
  constructor(targetX, targetY, body, options = {}) {
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
    this.friction = options.friction ?? 0.1
    this.maxDistance = options.maxDistance ?? 0.0
    this.invDt = options.invDt ?? 60

    this.normalImpulse = 0
    this.tangentImpulse = 0
  }
  
  set(x, y) {
    const { target, body } = this 
    
    target.set(x, y)
    
    if (!body) {
      return
    }
    
    const dx = target.x - body.position.x
    const dy = target.y - body.position.y

    // Local
    this.anchorX = dx * body.cos + dy * body.sin
    this.anchorY = -dx * body.sin + dy * body.cos
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
    let tangentX = 0
    let tangentY = 0

    if (dist >= 1e-6) {
      normalX = dx / dist
      normalY = dy / dist
    }
    
    const vA = body.linearVelocity
    const wA = body.angularVelocity

    const relVelX = -(vA.x - rAY * wA)
    const relVelY = -(vA.y + rAX * wA)
    const vn = relVelX * normalX + relVelY * normalY
    
    tangentX = (relVelX - (normalX * vn))
    tangentY = (relVelY - (normalY * vn))
    
    const tMagSq = tangentX * tangentX + tangentY * tangentY
    
    if (tMagSq >= 1e-6) {
      const magSq = Math.sqrt(tMagSq)
      
      tangentX /= magSq
      tangentY /= magSq
    }

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
    this.effNormalMass = kn == 0 ? 0 : 1 / kn
    this.effTangentMass = kt == 0 ? 0 : 1 / kt

    this.C = (maxDistance - dist) * (this.stiffness * this.invDt)
  }

  warmStart() {
    const {
      body,
      normalX,
      normalY,
      rnA,
      tangentX,
      tangentY,
      rtA,
      normalImpulse,
      tangentImpulse
    } = this

    const mA = body.invMass
    const iA = body.invInertia

    body.linearVelocity.x -= normalX * normalImpulse * mA
    body.linearVelocity.y -= normalY * normalImpulse * mA
    body.angularVelocity -= rnA * normalImpulse * iA
    
    body.linearVelocity.x -= tangentX * tangentImpulse * mA
    body.linearVelocity.y -= tangentY * tangentImpulse * mA
    body.angularVelocity -= rtA * tangentImpulse * iA
  }

  solve(useBias = false) {
    const {
      body,
      normalX,
      normalY,
      rnA,
      tangentX,
      tangentY,
      rtA,
      effNormalMass,
      effTangentMass
    } = this

    const mA = body.invMass
    const iA = body.invInertia
    const vA = body.linearVelocity
    let wA = body.angularVelocity

    let relVelX = -(vA.x - this.rAY * wA)
    let relVelY = -(vA.y + this.rAX * wA)
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
    
    // Friction 
    relVelX = -(vA.x - this.rAY * wA)
    relVelY = -(vA.y + this.rAX * wA)
    
    const vt = relVelX * tangentX + relVelY * tangentY
    
    let lambda = vt * effTangentMass
    const maxLambda = this.friction * this.normalImpulse
    const oldLambda = this.tangentImpulse
    let newLambda = oldLambda + lambda
    
    newLambda = 
      newLambda < -maxLambda
        ? -maxLambda
        : newLambda > maxLambda 
          ? maxLambda
          : newLambda
    
    this.tangentImpulse = newLambda
    lambda = newLambda - oldLambda
    
    vA.x -= tangentX * lambda * mA
    vA.y -= tangentY * lambda * mA
    wA -= rtA * lambda * iA

    body.angularVelocity = wA
  }
}
