import boxStacks from './box-stacks.js'

export default (
	s2,
	world,
	options = {
		columns: 35,
		rows: 30,
		spacing: 0.024,
		boxWidth: 0.24,
		boxHeight: 0.24,
		groundWidth: 1000,
		groundHeight: 0.48,
		centerX: 0,
		bottomY: 0
	}
) => {
	boxStacks(s2, world, options)
}
