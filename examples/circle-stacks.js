import { RigidBody } from '../src/suffic2d.js'

export default (world, options = {}) => {
	const {
		columns = 8,
		rows = 10,
		radius = 0.24,
		spacing = 0.024,
		groundWidth = 5,
		groundHeight = 0.48,
		centerX = 0,
		bottomY = 0
	} = options

	const ground = new RigidBody(centerX, bottomY + groundHeight, 0, {
		isStatic: true
	}).createRectangle(groundWidth, groundHeight, {})

	world.createBody(ground)

	const colStep = radius * 2 + spacing
	const rowStep = radius * 2 + spacing
	const startX = centerX - (columns - 1) * colStep * 0.5

	for (let col = 0; col < columns; ++col) {
		const x = startX + col * colStep

		for (let row = 0; row < rows; ++row) {
			const body = new RigidBody(x, bottomY - radius - row * rowStep, 0, {
				friction: 0.3
			}).createCircle(radius, {})

			world.createBody(body)
		}
	}
}
