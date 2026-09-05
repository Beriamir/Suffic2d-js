import { RigidBody } from '../src/suffic2d.js'

export default (world, options = {}) => {
	const {
		boxWidth = 0.24,
		boxHeight = 0.24,
		spacing = 0.024,
		groundWidth = 10,
		groundHeight = 0.48,
		centerX = 0,
		bottomY = 0
	} = options

	const ground = new RigidBody(centerX, bottomY + groundHeight, 0, {
		isStatic: true
	})
		.createRectangle(groundWidth, groundHeight, {})
		.createRectangle(groundHeight, groundHeight, {
			offset: { x: groundWidth - groundHeight, y: -groundHeight * 2 }
		})

	world.createBody(ground)

	for (let i = 10, j = 0; i >= 0; i--, j++) {
		const body = new RigidBody(-groundWidth + j + spacing, -boxHeight * 2, 0, {
			friction: i / 10
		})
			.addForce({ x: 5, y: 0 })
			.createRectangle(boxWidth, boxHeight, {})

		world.createBody(body)
	}
}
