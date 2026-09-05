import Vector from './Vector.js'
import AABB from './AABB.js'
import Polygon from './Polygon.js'
import Circle from './Circle.js'
import Rectangle from './Rectangle.js'
import Capsule from './Capsule.js'
import Line from './Line.js'

export default class RigidBody {
	static ids = 0
	constructor(x, y, rot, options = {}) {
		this.id = RigidBody.ids++
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
		this.sleepingTime = 0
		this.islandId = 0

		this.contactKeys = []
		this.jointKeys = []

		this.restitution = options.restitution ?? 0.0
		this.friction = options.friction ?? 0.0
		this.density = 0
		this.area = 0
		this.mass = 0
		this.inertia = 0

		this.invMass = 0
		this.invInertia = 0

		this.fixtureIds = 0
		this.fixtures = []
		this.anchors = []
		this.aabb = new AABB()
	}

	addForce(force, dt = 1) {
		if (this.isStatic) {
			return this
		}

		this.linearVelocity.x += force.x * dt
		this.linearVelocity.y += force.y * dt
		return this
	}

	addTorque(torque) {
		if (this.isStatic) {
			return this
		}

		this.angularVelocity += torque
		return this
	}

	testPoint(pointX, pointY) {
		for (let i = 0; i < this.fixtures.length; ++i) {
			const s = this.fixtures[i]

			if (s.testPoint(pointX, pointY)) {
				return true
			}
		}

		return false
	}

	awake() {
		this.isSleeping = false
		this.sleepingTime = 0
	}

	canSleep() {
		const linearTol = 0.01
		const angularTol = 0.03

		return (
			this.contactKeys.length > 0 &&
			this.linearVelocity.magSq() <= linearTol * linearTol &&
			this.angularVelocity * this.angularVelocity <= angularTol * angularTol
		)
	}

	createFixture(shape) {
		if (shape.index > 0) {
			return
		}

		this.fixtures.push(shape)
		shape.id = this.fixtureIds++
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
			return this
		}

		this.invMass = 1 / this.mass
		this.invInertia = 1 / this.inertia
		return this
	}

	updateAABB() {
		let minX = Infinity
		let minY = Infinity
		let maxX = -minX
		let maxY = -minY

		for (const s of this.fixtures) {
			if (s.aabb.minX < minX) minX = s.aabb.minX
			if (s.aabb.minY < minY) minY = s.aabb.minY
			if (s.aabb.maxX > maxX) maxX = s.aabb.maxX
			if (s.aabb.maxY > maxY) maxY = s.aabb.maxY
		}

		this.aabb.set(minX, minY, maxX, maxY)
		return this
	}

	createPolygon(vertices, option = {}) {
		const polygon = new Polygon(vertices, option)

		this.createFixture(polygon)
		return this
	}

	createCircle(radius, option = {}) {
		const circle = new Circle(radius, option)

		this.createFixture(circle)
		return this
	}

	createRectangle(width, height, option = {}) {
		const rectangle = new Rectangle(width, height, option)

		this.createFixture(rectangle)
		return this
	}

	createCapsule(length, radius, option = {}) {
		const capsule = new Capsule(length, radius, option)

		this.createFixture(capsule)
		return this
	}

	createLine(length, option = {}) {
		const line = new Line(length, option)

		this.createFixture(line)
		return this
	}
}
