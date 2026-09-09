import Touch from './Touch.js'
import Mouse from './Mouse.js'
import Keyboard from './Keyboard.js'
import Event from './Event.js'

export default class Input {
	constructor(target = window) {
		this.target = target
		this.mouse = new Mouse(this)
		this.touch = new Touch(this)
		this.keyboard = new Keyboard(this)
		this.event = new Event()

		window.addEventListener('resize', e => {
			this.emit(
				'resize',
				parseFloat(getComputedStyle(target).width),
				parseFloat(getComputedStyle(target).height)
			)
		})
	}

	on(name, callback) {
		this.event.on(name, callback)
		return this
	}

	off(name, callback) {
		this.event.off(name, callback)
		return this
	}

	emit(name, ...data) {
		this.event.emit(name, data)
		return this
	}
}
