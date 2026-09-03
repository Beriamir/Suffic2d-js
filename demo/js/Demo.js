import { GrabJoint } from '../../src/suffic2d.js'
import SceneManager from './SceneManager.js'

export default class Demo extends SceneManager {
	constructor(world) {
		super(world)
		this.grabJoint = new GrabJoint(0, 0, null)
	}

	initialize() {
		this.load('Pyramid')
		//
	}

	onDown(pointX, pointY) {
		const query = this.world.queryPoint(pointX, pointY)

		for (const body of query) {
			if (body.testPoint(pointX, pointY)) {
				this.grabJoint.set(pointX, pointY, body)
				this.world.createJoint(this.grabJoint)
				break
			}
		}
	}

	onMove(dx, dy) {
		this.grabJoint.move(dx, dy)
	}

	onUp() {
		this.world.destroyJoint(this.grabJoint)
	}

	update(dt) {
		const deadBottom = 100 // meters down

		for (let i = 0; i < this.world.bodies.length; i++) {
			const body = this.world.bodies[i]

			if (body.position.y >= deadBottom) {
				this.world.destroyBody(body)
				i--
			}
		}
	}
}
