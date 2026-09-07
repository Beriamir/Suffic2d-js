import { GrabJoint } from '../../src/suffic2d.js'

export default class Demo {
	setup(world) {
		this.world = world
		this.grabJoint = new GrabJoint(0, 0, null)
	}

	onDown(pointX, pointY) {
		const { world, grabJoint } = this

		for (const body of world.queryPoint(pointX, pointY)) {
			if (body.testPoint(pointX, pointY)) {
				grabJoint.set(pointX, pointY, body)
				world.createJoint(grabJoint)
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
		const deadBottom = 100

		for (let i = 0; i < this.world.bodies.length; i++) {
			const body = this.world.bodies[i]

			if (body.position.y >= deadBottom) {
				this.world.destroyBody(body)
				i--
			}
		}
	}
}
