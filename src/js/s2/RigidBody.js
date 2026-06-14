import Vector from './Vector.js'
import AABB from './AABB.js'

export default class RigidBody {
  static uid = 0
  constructor(x, y, rot, options = {}) {
    this.id = RigidBody.uid++
    this.type = 'rigid'

    this.position = new Vector(x, y)
    this.rotation = rot
    this.cos = Math.cos(rot)
    this.sin = Math.sin(rot)

    this.linearVelocity = options.linearVelocity ?? new Vector()
    this.angularVelocity = options.angularVelocity ?? 0
    this.surfaceSpeed = options.surfaceSpeed ?? new Vector()

    this.isStatic = options.isStatic ?? false
    this.isSensor = options.isSensor ?? false
    this.isSleeping = options.isSleeping ?? false

    this.restitution = options.restitution ?? 0.1
    this.friction = options.friction ?? 0.3
    this.density = 0
    this.area = 0
    this.mass = 0
    this.inertia = 0

    this.invMass = 0
    this.invInertia = 0

    this.fixtures = []
    this.anchors = []
    this.aabb = new AABB()
  }
  createFixture(shape) {
    this.fixtures.push(shape)
    shape.index = this.fixtures.length - 1
    this.updateMass()
    this.updateAABB()
    return this
  }
  destroyFixture(shape) {
    const index = shape.index
    const last = this.fixtures.length - 1

    this.fixtures[index] = this.fixtures[last]
    this.fixtures.pop()
    shape.index = -1
    this.updateMass()
    this.updateAABB()
    return this
  }
  createAnchor(anchor) {
    this.anchors.push(anchor)
    anchor.index = this.anchors.length - 1
    return this
  }
  destroyAnchor(anchor) {
    const index = anchor.index
    const last = this.anchors.length - 1

    this.anchors[index] = this.anchors[last]
    this.anchors.pop()
    anchor.index = -1
    return this
  }
  updateMass() {
    this.density = 0
    this.area = 0
    this.mass = 0
    this.inertia = 0

    for (const s of this.fixtures) {
      this.density += s.density
      this.area += s.area
      this.mass += s.mass
      this.inertia += s.inertia
    }

    if (this.isStatic) {
      this.invMass = 0
      this.invInertia = 0
      return
    }

    this.invMass = 1 / this.mass
    this.invInertia = 1 / this.inertia
  }
  updateAABB() {
    const aabb = this.aabb
    const position = this.position
    const cos = this.cos
    const sin = this.sin

    aabb.minX = Infinity
    aabb.minY = Infinity
    aabb.maxX = -Infinity
    aabb.maxY = -Infinity

    for (const s of this.fixtures) {
      for (let i = 0; i < s.vertices.length; i += 2) {
        const x0 = s.offset.x + s.vertices[i]
        const y0 = s.offset.y + s.vertices[i + 1]
        const x1 = position.x + (x0 * cos - y0 * sin)
        const y1 = position.y + (x0 * sin + y0 * cos)

        if (x1 < aabb.minX) aabb.minX = x1
        if (y1 < aabb.minY) aabb.minY = y1
        if (x1 > aabb.maxX) aabb.maxX = x1
        if (y1 > aabb.maxY) aabb.maxY = y1
      }
    }
  }
  translate(vector, s = 1) {
    this.position.addMulV(vector, s)
  }
  rotate(angle) {
    this.rotation += angle
    this.cos = Math.cos(this.rotation)
    this.sin = Math.sin(this.rotation)
  }
  addForce(force, s = 1) {
    this.linearVelocity.add(force, s)
  }
  addTorque(torque) {
    this.angularVelocity += torque
  }
}
