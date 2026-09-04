import pyramid from './pyramid.js'

export default (
	world,
	options = {
		rows: 5,
		spacing: -0.75 * 0.24,
		boxWidth: 0.24,
		boxHeight: 0.24,
		groundWidth: 5,
		groundHeight: 0.48,
		centerX: 0,
		bottomY: 0
	}
) => {
	pyramid(world, options)
}
