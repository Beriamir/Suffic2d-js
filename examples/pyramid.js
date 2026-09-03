import { RigidBody } from '../src/suffic2d.js'

export default (world, options = {}) => {
	const {
		rows = 10,
		spacing = 0.024,
		boxWidth = 0.24,
		boxHeight = 0.24,
		groundWidth = 1000,
		groundHeight = 0.48,
		centerX = 0,
		bottomY = 0
	} = options

	const ground = new RigidBody(centerX, bottomY + groundHeight, 0, {
		isStatic: true
	}).createRectangle(groundWidth, groundHeight, {})

	world.createBody(ground)

	const colStep = boxWidth * 2 + spacing
	const rowStep = boxHeight * 2 + spacing

	for (let row = 0; row < rows; ++row) {
		const count = rows - row
		const startX = centerX - (count - 1) * colStep * 0.5
		const y = bottomY - boxHeight - row * rowStep

		for (let col = 0; col < count; ++col) {
			const body = new RigidBody(startX + col * colStep, y, 0, {
				friction: 0.3
			}).createRectangle(boxWidth, boxHeight, {})

			world.createBody(body)
		}
	}
}
