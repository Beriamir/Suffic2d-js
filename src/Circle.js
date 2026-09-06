import Vector from './Vector.js'
import AABB from './AABB.js'

export default class Circle {
	constructor(radius, options = {}) {
		this.type = 'circle'
		this.radius = radius
		this.center = new Vector()

		this.offset = options.offset ?? new Vector()
		this.rotation = options.rotation ?? 0
		this.cos = Math.cos(this.rotation)
		this.sin = Math.sin(this.rotation)

		this.density = options.density ?? 1
		this.thickness = options.thickness ?? 1
		this.area = Math.PI * radius * radius
		this.mass = this.density * this.area * this.thickness
		this.inertia = 0.5 * this.mass * radius * radius

		this.aabb = new AABB()
	}

	scale(value) {
		this.radius *= value
		this.offset.x *= value
		this.offset.y *= value
		this.updateMass()
	}

	testPoint(pointX, pointY) {
		const dx = pointX - this.center.x
		const dy = pointY - this.center.y
		const magSq = dx * dx + dy * dy

		if (magSq <= this.radius * this.radius) {
			return true
		}

		return false
	}

	updateWorldVertices(x, y, cos, sin) {
		const localX = this.offset.x
		const localY = this.offset.y

		this.center.x = x + (localX * cos - localY * sin)
		this.center.y = y + (localX * sin + localY * cos)
		this.updateAABB()
	}

	updateMass() {
		this.area = Math.PI * this.radius * this.radius
		this.mass = this.density * this.area * this.thickness
		this.inertia = 0.5 * this.mass * this.radius * this.radius
	}

	updateAABB() {
		this.aabb.minX = this.center.x - this.radius
		this.aabb.minY = this.center.y - this.radius
		this.aabb.maxX = this.center.x + this.radius
		this.aabb.maxY = this.center.y + this.radius
		return this.aabb
	}
}
