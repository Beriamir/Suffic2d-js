import { RigidBody } from '../src/suffic2d.js'

export default (world, options = {}) => {
	const {
		spacing = 1,
		rampWidth = 8,
		rampHeight = 0.24,
		groundWidth = 1000,
		groundHeight = 0.48,
		centerX = 0,
		bottomY = 0
	} = options

	const ramp = new RigidBody(-rampWidth * 0.3, -5, 0.2, {
		isStatic: true
	}).createRectangle(rampWidth, rampHeight, {})

	const ground = new RigidBody(centerX, bottomY + groundHeight, 0, {
		isStatic: true
	}).createRectangle(groundWidth, groundHeight, {})

	world.createBody(ramp)
	world.createBody(ground)

	for (let i = 10, j = 0; i >= 0; i--, j++) {
		const size = 0.24
		const body = new RigidBody(
			-rampWidth + j * spacing,
			-10 + size * j,
			ramp.rotation,
			{
				friction: i / 10
			}
		).createRectangle(size, size, {})

		world.createBody(body)
	}
}
