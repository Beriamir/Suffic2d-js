import pyramid from './pyramid.js'

export default (
	s2,
	world,
	options = {
		rows: 45,
		spacing: 0.0,
		boxWidth: 0.24,
		boxHeight: 0.24,
		groundWidth: 1000,
		groundHeight: 0.48,
		centerX: 0,
		bottomY: 0
	}
) => {
	pyramid(s2, world, options)
}
