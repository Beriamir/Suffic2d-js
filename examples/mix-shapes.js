import { RigidBody, Vector } from '../src/suffic2d.js'

export default (world, options = {}) => {
	const {
		count = 50,
		size = 0.24,
		groundWidth = 5,
		centerX = 0,
		bottomY = 0
	} = options

	const ground = new RigidBody(centerX, bottomY, 0, {
		isStatic: true
	})
		.createLine(groundWidth, {
			rotation: Math.PI * 0.5
		})
		.createLine(groundWidth, {
			offset: new Vector(-groundWidth * 0.5, -groundWidth * 0.5),
			rotation: 0
		})
		.createLine(groundWidth, {
			offset: new Vector(groundWidth * 0.5, -groundWidth * 0.5),
			rotation: 0
		})

	world.createBody(ground)

	const eachCount = Math.floor(count / 3)

	for (let i = 0; i < eachCount; i++) {
		const x = Math.random() * groundWidth - groundWidth * 0.5
		const y = Math.random() * -groundWidth
		const body = new RigidBody(x, y, 0, {
			friction: 0.3
		}).createCircle(size, {})

		world.createBody(body)
	}

	for (let i = 0; i < eachCount; i++) {
		const x = Math.random() * groundWidth - groundWidth * 0.5
		const y = Math.random() * -groundWidth
		const body = new RigidBody(x, y, 0, {
			friction: 0.3
		}).createCapsule(size * 1.25, size * 0.75, {
			roundness: 9
		})

		world.createBody(body)
	}

	for (let i = 0; i < eachCount; i++) {
		const x = Math.random() * groundWidth - groundWidth * 0.5
		const y = Math.random() * -groundWidth
		const body = new RigidBody(x, y, 0, {
			friction: 0.3
		}).createPolygon(
			new Float32Array([-size, -size, size, -size, size, size, -size, size]),
			{}
		)

		world.createBody(body)
	}
}
