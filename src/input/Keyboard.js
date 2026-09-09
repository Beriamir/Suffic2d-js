export default class Keyboard {
	constructor(input) {
		this.keys = new Set()

		window.addEventListener('keydown', event => {
			event.preventDefault()
			this.keys.add(event.code)

			if (this.isDown('ArrowUp') || this.isDown('KeyW')) {
				input.emit('pan', 0, 10)
			} else if (this.isDown('ArrowDown') || this.isDown('KeyS')) {
				input.emit('pan', 0, -10)
			}

			if (this.isDown('ArrowLeft') || this.isDown('KeyA')) {
				input.emit('pan', 10, 0)
			} else if (this.isDown('ArrowRight') || this.isDown('KeyD')) {
				input.emit('pan', -10, 0)
			}

			if (
				(this.isDown('ControlLeft') || this.isDown('ControlRight')) &&
				this.isDown('Equal')
			) {
				input.emit('zoom', 1 + 0.1)
			} else if (
				(this.isDown('ControlLeft') || this.isDown('ControlRight')) &&
				this.isDown('Minus')
			) {
				input.emit('zoom', 1 - 0.1)
			}
		})

		window.addEventListener('keyup', event => {
			this.keys.delete(event.code)
		})
	}

	isDown(code = '') {
		return this.keys.has(code)
	}
}
