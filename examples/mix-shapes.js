import { RigidBody, Vector } from '../src/suffic2d.js'

function createCapsuleVertices(length, radius, roundness = 9) {
	const capsule = []
	const halfLength = length * 0.5

	for (let i = 0; i <= roundness; i++) {
		const t = (i * Math.PI) / roundness
		capsule.push(Math.cos(t) * radius, halfLength + Math.sin(t) * radius)
	}

	for (let i = 0; i <= roundness; i++) {
		const t = Math.PI + (i * Math.PI) / roundness
		capsule.push(Math.cos(t) * radius, -halfLength + Math.sin(t) * radius)
	}

	return new Float32Array(capsule)
}

export default (world, options = {}) => {
	const {
		count = 50,
		size = 0.24,
		wallSize = 5,
		centerX = 0,
		bottomY = 0
	} = options

	const wall = new RigidBody(centerX, bottomY, 0, {
		isStatic: true
	})
		.createLine(wallSize, {
			rotation: Math.PI * 0.5
		})
		.createLine(wallSize, {
			offset: new Vector(0, -wallSize),
			rotation: Math.PI * 0.5
		})
		.createLine(wallSize, {
			offset: new Vector(-wallSize * 0.5, -wallSize * 0.5),
			rotation: 0
		})
		.createLine(wallSize, {
			offset: new Vector(wallSize * 0.5, -wallSize * 0.5),
			rotation: 0
		})

	world.createBody(wall)

	const eachCount = Math.floor(count / 4)

	for (let i = 0; i < eachCount; i++) {
		const x = Math.random() * wallSize - wallSize * 0.5
		const y = Math.random() * -wallSize
		const body = new RigidBody(x, y, 0, {
			friction: 0.3
		}).createCircle(size, {})

		world.createBody(body)
	}

	for (let i = 0; i < eachCount; i++) {
		const x = Math.random() * wallSize - wallSize * 0.5
		const y = Math.random() * -wallSize
		const body = new RigidBody(x, y, 0, {
			friction: 0.3
		}).createCapsule(size * 1.25, size * 0.75, {
			roundness: 9
		})

		world.createBody(body)
	}

	for (let i = 0; i < eachCount; i++) {
		const x = Math.random() * wallSize - wallSize * 0.5
		const y = Math.random() * -wallSize
		const body = new RigidBody(x, y, 0, {
			friction: 0.3
		}).createPolygon(createCapsuleVertices(size * 1.25, size * 0.75, 9), {})

		world.createBody(body)
	}

	for (let i = 0; i < eachCount; i++) {
		const x = Math.random() * wallSize - wallSize * 0.5
		const y = Math.random() * -wallSize
		const body = new RigidBody(x, y, 0, {
			friction: 0.3
		}).createRectangle(size, size, {})

		world.createBody(body)
	}
}
