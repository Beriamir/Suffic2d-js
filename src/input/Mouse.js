export default class Mouse {
	static LEFT = 0
	static MIDDLE = 1
	static RIGHT = 2

	constructor(input) {
		const target = input.target

		this.buttons = new Set()
		this.lastX = 0
		this.lastY = 0

		target.addEventListener('mousedown', event => {
			event.preventDefault()

			const rect = target.getBoundingClientRect()
			const mouseX = event.clientX - rect.left
			const mouseY = event.clientY - rect.top

			this.buttons.add(event.button)
			this.lastX = mouseX
			this.lastY = mouseY

			input.emit('down', mouseX, mouseY)
		})

		target.addEventListener('mousemove', event => {
			event.preventDefault()

			const rect = target.getBoundingClientRect()
			const mouseX = event.clientX - rect.left
			const mouseY = event.clientY - rect.top

			const dx = mouseX - this.lastX
			const dy = mouseY - this.lastY

			input.emit('move', dx, dy, mouseX, mouseY)

			if (input.keyboard.isDown('Space') && this.isDown(Mouse.LEFT)) {
				input.emit('pan', dx, dy)
			}

			if (this.isDown(Mouse.MIDDLE)) {
				input.emit('pan', dx, dy)
			}

			this.lastX = mouseX
			this.lastY = mouseY
		})

		target.addEventListener('mouseup', event => {
			event.preventDefault()
			this.buttons.delete(event.button)
			this.lastX = 0
			this.lastY = 0

			input.emit('up', null)
		})

		target.addEventListener(
			'wheel',
			event => {
				event.preventDefault()

				if (input.keyboard.isDown('KeyR')) {
					input.emit('rotate', Math.atan2(event.deltaY, event.deltaX) * 0.1)
				}

				input.emit('zoom', 1 - event.deltaY * 0.001)
			},
			{ passive: false }
		)
	}

	isDown(button) {
		return this.buttons.has(button)
	}
}
