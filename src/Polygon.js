import Vector from './Vector.js'
import Vertices from './Vertices.js'
import AABB from './AABB.js'

export default class Polygon {
	constructor(vertices, options = {}) {
		this.type = 'polygon'
		this.vertices = vertices
		this.worldVertices = new Float32Array(vertices.length)
		this.center = new Vector()
		this.axes = this.getAxes(vertices)
		this.worldAxes = new Float32Array(this.axes.length)

		this.offset = options.offset ?? new Vector()
		this.rotation = options.rotation ?? 0
		this.cos = Math.cos(this.rotation)
		this.sin = Math.sin(this.rotation)

		this.density = options.density ?? 1
		this.thickness = options.thickness ?? 1
		this.area = Vertices.getArea(vertices)
		this.mass = this.density * this.area * this.thickness
		this.inertia = Vertices.getInertia(vertices, this.mass)

		this.aabb = new AABB()
	}

	getAxes(vertices) {
		const n = vertices.length
		const axes = new Float32Array(n)

		for (let i = 0; i < n; i += 2) {
			const j = i < n - 2 ? i + 2 : 0

			const x0 = vertices[i]
			const y0 = vertices[i + 1]
			const x1 = vertices[j]
			const y1 = vertices[j + 1]

			const axisX = -(y1 - y0)
			const axisY = x1 - x0
			const invMag = 1 / Math.sqrt(axisX * axisX + axisY * axisY)

			axes[i] = axisX * invMag
			axes[i + 1] = axisY * invMag
		}

		return axes
	}

	scale(value) {
		for (let i = 0; i < this.vertices.length; i += 2) {
			this.vertices[i] *= value
			this.vertices[i + 1] *= value
		}
		this.offset.x *= value
		this.offset.y *= value
		this.updateMass()
	}

	testPoint(pointX, pointY) {
		const n = this.worldVertices.length

		for (let i = 0; i < n; i += 2) {
			const j = i < n - 2 ? i + 2 : 0

			const x0 = this.worldVertices[i]
			const y0 = this.worldVertices[i + 1]
			const x1 = this.worldVertices[j]
			const y1 = this.worldVertices[j + 1]

			const edgeX = x1 - x0
			const edgeY = y1 - y0
			const abX = pointX - x0
			const abY = pointY - y0

			if (edgeX * abY - edgeY * abX < 0) {
				return false
			}
		}

		return true
	}

	updateWorldVertices(x, y, cos, sin) {
		for (let i = 0; i < this.vertices.length; i += 2) {
			const x0 = this.vertices[i]
			const y0 = this.vertices[i + 1]
			const localX = this.offset.x + (x0 * this.cos - y0 * this.sin)
			const localY = this.offset.y + (x0 * this.sin + y0 * this.cos)

			this.worldVertices[i] = x + (localX * cos - localY * sin)
			this.worldVertices[i + 1] = y + (localX * sin + localY * cos)

			const axisX = this.axes[i]
			const axisY = this.axes[i + 1]
			const axisCos = this.cos * cos - this.sin * sin
			const axisSin = this.cos * sin + this.sin * cos

			this.worldAxes[i] = axisX * axisCos - axisY * axisSin
			this.worldAxes[i + 1] = axisX * axisSin + axisY * axisCos
		}

		Vertices.getCentroid(this.worldVertices, this.center)
		this.updateAABB()
	}

	updateMass() {
		this.area = Vertices.getArea(this.vertices)
		this.mass = this.density * this.area * this.thickness
		this.inertia = Vertices.getInertia(this.vertices, this.mass)
	}

	updateAABB() {
		let minX = Infinity
		let minY = Infinity
		let maxX = -minX
		let maxY = -minY

		for (let i = 0; i < this.worldVertices.length; i += 2) {
			const x0 = this.worldVertices[i]
			const y0 = this.worldVertices[i + 1]

			if (x0 < minX) minX = x0
			if (x0 > maxX) maxX = x0

			if (y0 < minY) minY = y0
			if (y0 > maxY) maxY = y0
		}

		this.aabb.set(minX, minY, maxX, maxY)
		return this.aabb
	}
}
