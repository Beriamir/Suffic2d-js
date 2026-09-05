import { RigidBody, Vector } from '../src/suffic2d.js'

function roundPoly(radius, roundness = 16) {
	const vertices = []

	for (let i = 0; i < roundness; ++i) {
		const angle = (i * Math.PI * 2) / roundness
		const x = radius * Math.cos(angle)
		const y = radius * Math.sin(angle)

		vertices.push(x, y)
	}

	return new Float32Array(vertices)
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
	const option = {
		friction: 0.3,
		restitution: 0.0
	}

	for (let i = 0; i < eachCount; i++) {
		const x = Math.random() * wallSize - wallSize * 0.5
		const y = Math.random() * -wallSize
		const body = new RigidBody(x, y, 0, option).createCircle(size, {})

		world.createBody(body)
	}

	for (let i = 0; i < eachCount; i++) {
		const x = Math.random() * wallSize - wallSize * 0.5
		const y = Math.random() * -wallSize
		const body = new RigidBody(x, y, 0, option).createCapsule(
			size * 1.25,
			size * 0.75,
			{}
		)

		world.createBody(body)
	}

	for (let i = 0; i < eachCount; i++) {
		const x = Math.random() * wallSize - wallSize * 0.5
		const y = Math.random() * -wallSize
		const body = new RigidBody(x, y, 0, option).createPolygon(
			roundPoly(size, 9)
		)

		world.createBody(body)
	}

	for (let i = 0; i < eachCount; i++) {
		const x = Math.random() * wallSize - wallSize * 0.5
		const y = Math.random() * -wallSize
		const body = new RigidBody(x, y, 0, option).createRectangle(size, size, {})

		world.createBody(body)
	}
}
