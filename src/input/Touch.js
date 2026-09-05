export default class Touch {
	constructor(input) {
		this.input = input

		this.gestureIds = []
		this.gestureCenter = { x: 0, y: 0 }
		this.lastGestureCenter = { x: 0, y: 0 }
		this.lastGestureDistance = 0
		this.lastGestureRotation = 0

		this.touchId = null
		this.lastTouchX = 0
		this.lastTouchY = 0

		const target = input.target

		if (!target) {
			return
		}

		target.addEventListener(
			'touchstart',
			e => {
				e.preventDefault()
				this.beginGestureFromTouches(e.touches)
			},
			{ passive: false }
		)

		target.addEventListener(
			'touchmove',
			e => {
				e.preventDefault()
				const rect = target.getBoundingClientRect()

				if (this.touchId !== null) {
					const touch = this.findTouch(e.touches, this.touchId)
					const touchX = touch.clientX - rect.left
					const touchY = touch.clientY - rect.top

					if (touch) {
						const dx = touchX - this.lastTouchX
						const dy = touchY - this.lastTouchY

						if (typeof input.onMove == 'function') {
							input.onMove(dx, dy, touchX, touchY)
						}
					}

					this.lastTouchX = touchX
					this.lastTouchY = touchY
				}

				// pan + zoom + rotate
				if (this.gestureIds[0] !== null && this.gestureIds[1] !== null) {
					const a = this.findTouch(e.touches, this.gestureIds[0])
					const b = this.findTouch(e.touches, this.gestureIds[1])

					if (a && b) {
						const center = this.getCenter(a, b, this.gestureCenter)
						const distance = this.getDistance(a, b)
						const rotation = this.getRotation(a, b)

						if (typeof input.onPan == 'function') {
							const dx = center.x - this.lastGestureCenter.x
							const dy = center.y - this.lastGestureCenter.y

							input.onPan(dx, dy)
						}

						if (typeof input.onZoom == 'function') {
							input.onZoom(distance / this.lastGestureDistance)
						}

						if (typeof input.onRotate == 'function') {
							input.onRotate(rotation - this.lastGestureRotation)
						}

						this.lastGestureCenter.x = center.x
						this.lastGestureCenter.y = center.y
						this.lastGestureDistance = distance
						this.lastGestureRotation = rotation
					}
				}
			},
			{ passive: false }
		)

		target.addEventListener('touchend', e =>
			this.beginGestureFromTouches(e.touches)
		)
		target.addEventListener('touchcancel', e =>
			this.beginGestureFromTouches(e.touches)
		)
	}

	findTouch(touches, id) {
		for (let i = 0; i < touches.length; i++) {
			if (touches[i].identifier === id) return touches[i]
		}
		return null
	}

	getCenter(a, b, out = {}) {
		const rect = this.input.target.getBoundingClientRect()

		out.x = (a.clientX + b.clientX) * 0.5 - rect.left
		out.y = (a.clientY + b.clientY) * 0.5 - rect.top
		return out
	}

	getDistance(a, b) {
		const dx = a.clientX - b.clientX
		const dy = a.clientY - b.clientY
		return Math.sqrt(dx * dx + dy * dy)
	}

	getRotation(a, b) {
		return Math.atan2(b.clientY - a.clientY, b.clientX - a.clientX)
	}

	beginGestureFromTouches(touches) {
		this.gestureIds[0] = null
		this.gestureIds[1] = null
		this.lastGestureCenter.x = 0
		this.lastGestureCenter.y = 0
		this.lastGestureDistance = 0
		this.lastGestureRotation = 0

		this.touchId = null
		this.lastTouchX = 0
		this.lastTouchY = 0

		if (touches.length == 1) {
			const rect = this.input.target.getBoundingClientRect()
			const touchX = touches[0].clientX - rect.left
			const touchY = touches[0].clientY - rect.top

			this.touchId = touches[0].identifier
			this.lastTouchX = touchX
			this.lastTouchY = touchY

			if (typeof this.input.onDown == 'function') {
				this.input.onDown(touchX, touchY)
			}
		} else if (touches.length >= 2) {
			this.gestureIds[0] = touches[0].identifier
			this.gestureIds[1] = touches[1].identifier
			this.getCenter(touches[0], touches[1], this.lastGestureCenter)
			this.lastGestureDistance = this.getDistance(touches[0], touches[1])
			this.lastGestureRotation = this.getRotation(touches[0], touches[1])
		} else {
			if (typeof this.input.onUp == 'function') {
				this.input.onUp()
			}
		}
	}
}
