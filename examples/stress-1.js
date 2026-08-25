import mixShapes from './mix-shapes.js'

export default (
	world,
	options = {
		count: 1000,
		size: 0.24,
		wallSize: 20,
		centerX: 0,
		bottomY: 0
	}
) => {
	mixShapes(world, options)
}
