import Graphics from './Graphics.js'
import Camera from './Camera.js'

export default class Renderer {
	constructor(canvas, options = {}) {
		this.canvas = canvas
		this.gfx = new Graphics(canvas, options)
		this.camera = new Camera(0, 0, 0, 100)
		this.pixelDensity = options.pixelDensity ?? 1
		this.resize(
			parseFloat(getComputedStyle(canvas).width),
			parseFloat(getComputedStyle(canvas).height)
		)
	}

	resize(w, h) {
		const px = this.pixelDensity

		this.canvas.width = w * px
		this.canvas.height = h * px
		return this
	}

	point(x, y) {
		const { camera, canvas, pixelDensity } = this

		const centerX = canvas.width * 0.5
		const centerY = canvas.height * 0.5
		const x0 = (x * pixelDensity - centerX) / camera.scale
		const y0 = (y * pixelDensity - centerY) / camera.scale

		return {
			x: camera.x + (x0 * camera.cos + y0 * camera.sin),
			y: camera.y + (-x0 * camera.sin + y0 * camera.cos)
		}
	}

	delta(dx, dy) {
		const { camera, canvas, pixelDensity } = this

		const moveX = dx * camera.cos + dy * camera.sin
		const moveY = -dx * camera.sin + dy * camera.cos

		return {
			x: (moveX * pixelDensity) / camera.scale,
			y: (moveY * pixelDensity) / camera.scale
		}
	}

	pan(dx, dy) {
		this.camera.move(dx, dy)
	}

	zoom(factor) {
		this.camera.zoom(factor)
	}

	rotate(delta) {
		this.camera.rotate(delta)
	}

	graphics() {
		return {
			gfx: this.gfx,
			camera: this.camera
		}
	}

	sync(input) {
		const renderer = this

		input.on('resize', (w, h) => {
			renderer.resize(w, h)
		})

		input.on('pan', (dx, dy) => {
			renderer.pan(dx, dy)
		})

		input.on('rotate', delta => {
			renderer.rotate(delta)
		})

		input.on('zoom', factor => {
			renderer.zoom(factor)
		})
	}
}
