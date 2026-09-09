export default class Event {
	constructor() {
		this.events = new Map()
	}

	on(name, callback) {
		if (!this.events.has(name)) {
			this.events.set(name, [])
		}

		this.events.get(name).push(callback)
	}

	off(name, callback) {
		if (!this.events.has(name)) {
			return
		}

		const listener = this.events.get(name).slice()

		for (let i = 0; i < listener.length; i++) {
			if (listener[i] === callback) {
				listener.splice(i, 1)
				break
			}
		}
	}

	emit(name, data) {
		if (!this.events.has(name)) {
			return
		}

		for (const callback of this.events.get(name)) {
			callback(...data)
		}
	}
}
