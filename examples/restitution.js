import { RigidBody } from '../src/suffic2d.js'

export default (world, options = {}) => {
	const {
		spacing = 0.24,
		radius = 0.24,
		groundWidth = 5,
		groundHeight = 0.48,
		centerX = 0,
		bottomY = 0
	} = options

	const ground = new RigidBody(centerX, bottomY + groundHeight, 0, {
		isStatic: true
	}).createRectangle(groundWidth, groundHeight, {})

	world.createBody(ground)

	const columns = 11
	const colStep = radius * 2 + spacing
	const rowStep = radius * 2 + spacing
	const startX = centerX - (columns - 1) * colStep * 0.5

	for (let col = 0; col < columns; ++col) {
		const x = startX + col * colStep
		const y = bottomY - radius * 5 - rowStep

		const body = new RigidBody(x, y, 0, {
			friction: 0.3,
			restitution: col / 10
		}).createCircle(radius, {})

		world.createBody(body)
	}
}
