import { GrabJoint } from '../../src/suffic2d.js'

export default class Demo {
	setup(world) {
		this.world = world
		this.grabJoint = new GrabJoint(0, 0, null)
	}

	onDown(point) {
		const { world, grabJoint } = this

		for (const body of world.queryPoint(point.x, point.y)) {
			if (body.testPoint(point.x, point.y)) {
				grabJoint.set(point.x, point.y, body)
				world.createJoint(grabJoint)
				break
			}
		}
	}

	onMove(delta) {
		this.grabJoint.move(delta.x, delta.y)
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
