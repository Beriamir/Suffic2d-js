import Vector from "./Vector.js"
import AABB from "./AABB.js"
import Polygon from "./Polygon.js"
import Circle from "./Circle.js"

export default class RigidBody {
  #rot
  static #uid = 0
  constructor(x, y, rot, options = {}) {
    this.id = RigidBody.#uid++
    this.type = "rigid"

    this.position = new Vector(x, y)
    this.#rot = rot
    this.cos = Math.cos(rot)
    this.sin = Math.sin(rot)

    this.linearVelocity = options.linearVelocity ?? new Vector()
    this.angularVelocity = options.angularVelocity ?? 0
    this.surfaceSpeed = options.surfaceSpeed ?? new Vector()

    this.isStatic = options.isStatic ?? false
    this.isSensor = options.isSensor ?? false
    this.isSleeping = options.isSleeping ?? false

    this.friction = options.friction ?? 0.0
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

  set rotation(value) {
    this.#rot = value
    this.cos = Math.cos(this.#rot)
    this.sin = Math.sin(this.#rot)
  }

  get rotation() {
    return this.#rot
  }

  createFixture(shape) {
    if (shape.index > 0) {
      return
    }

    this.fixtures.push(shape)
    shape.index = this.fixtures.length - 1
    shape.updateWorldVertices(
      this.position.x,
      this.position.y,
      this.cos,
      this.sin
    )

    this.updateMass()
    this.updateAABB()
    return this
  }

  destroyFixture(shape) {
    const index = shape.index
    const last = this.fixtures.length - 1

    if (index < 0 || index > last) {
      return
    }

    if (index != last) {
      this.fixtures[index] = this.fixtures[last]
      this.fixtures[index].index = index
    }

    this.fixtures.pop()
    shape.index = -1

    this.updateMass()
    this.updateAABB()
    return this
  }

  createAnchor(anchor) {
    if (anchor.index > 0) {
      return
    }

    this.anchors.push(anchor)
    anchor.index = this.anchors.length - 1
    return this
  }

  destroyAnchor(anchor) {
    const index = anchor.index
    const last = this.anchors.length - 1

    if (index < 0 || index > last) {
      return
    }

    if (index != last) {
      this.anchors[index] = this.anchors[last]
      this.anchors[index].index = index
    }

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
    this.aabb.set(Infinity, Infinity, -Infinity, -Infinity)

    for (const s of this.fixtures) {
      if (s.aabb.minX < this.aabb.minX) this.aabb.minX = s.aabb.minX
      if (s.aabb.minY < this.aabb.minY) this.aabb.minY = s.aabb.minY
      if (s.aabb.maxX > this.aabb.maxX) this.aabb.maxX = s.aabb.maxX
      if (s.aabb.maxY > this.aabb.maxY) this.aabb.maxY = s.aabb.maxY
    }

    return this.aabb
  }

  createPolygon(vertices, option = {}) {
    const polygon = new Polygon(vertices, option)

    this.createFixture(polygon)
    return polygon
  }

  createCircle(radius, option = {}) {
    const circle = new Circle(radius, option)

    this.createFixture(circle)
    return circle
  }
}
