export default class Mouse {
	#buttons = new Set()
	#lastX = 0
	#lastY = 0

	static LEFT = 0
	static MIDDLE = 1
	static RIGHT = 2

	constructor(input) {
		const target = input.target

		target.addEventListener('mousedown', event => {
			event.preventDefault()

			const rect = target.getBoundingClientRect()
			const mouseX = event.clientX - rect.left
			const mouseY = event.clientY - rect.top

			this.#buttons.add(event.button)
			this.#lastX = mouseX
			this.#lastY = mouseY

			if (typeof input.onDown == 'function') {
				input.onDown(mouseX, mouseY)
			}
		})

		target.addEventListener('mousemove', event => {
			event.preventDefault()

			const rect = target.getBoundingClientRect()
			const mouseX = event.clientX - rect.left
			const mouseY = event.clientY - rect.top

			const dx = mouseX - this.#lastX
			const dy = mouseY - this.#lastY

			if (typeof input.onMove == 'function') {
				input.onMove(dx, dy, mouseX, mouseY)
			}

			if (input.keyboard.isDown('Space') && this.isDown(Mouse.LEFT)) {
				if (typeof input.onPan == 'function') {
					input.onPan(dx, dy)
				}
			}

			if (this.isDown(Mouse.MIDDLE)) {
				if (typeof input.onPan == 'function') {
					input.onPan(dx, dy)
				}
			}

			this.#lastX = mouseX
			this.#lastY = mouseY
		})

		target.addEventListener('mouseup', event => {
			event.preventDefault()
			this.#buttons.delete(event.button)
			this.#lastX = 0
			this.#lastY = 0

			if (typeof input.onUp == 'function') {
				input.onUp()
			}
		})

		target.addEventListener(
			'wheel',
			event => {
				event.preventDefault()

				if (input.keyboard.isDown('KeyR')) {
					if (typeof input.onRotate == 'function') {
						input.onRotate(Math.atan2(event.deltaY, event.deltaX) * 0.1)
						return
					}
				}

				if (typeof input.onZoom == 'function') {
					input.onZoom(1 - event.deltaY * 0.001)
				}
			},
			{ passive: false }
		)
	}

	isDown(button) {
		return this.#buttons.has(button)
	}
}
