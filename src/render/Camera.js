export default class Camera {
	constructor(x = 0, y = 0, angle = 0, scale = 100) {
		this.x = x
		this.y = y
		this.angle = angle
		this.cos = Math.cos(angle)
		this.sin = Math.sin(angle)
		this.scale = scale
	}

	move(dx, dy) {
		const { cos, sin, scale } = this

		this.x -= (dx * cos + dy * sin) / scale
		this.y -= (-dx * sin + dy * cos) / scale
	}

	zoom(zoomFactor) {
		const minZoom = 0.00001
		const maxZoom = 10000.0
		const scale = this.scale

		this.scale = Math.max(minZoom, Math.min(scale * zoomFactor, maxZoom))
	}

	rotate(delta) {
		this.angle += delta
		this.cos = Math.cos(this.angle)
		this.sin = Math.sin(this.angle)
	}

	reset() {
		this.x = 0
		this.y = 0
		this.angle = 0
		this.scale = 100
	}
}
