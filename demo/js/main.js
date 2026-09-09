import { Renderer, Input, World } from '../../src/suffic2d.js'
import dat from '../../lib/dat.gui.js'
import Demo from './Demo.js'
import SceneManager from './SceneManager.js'
import { debugs, status } from './settings.js'

document.addEventListener('DOMContentLoaded', () => {
	const canvas = document.getElementById('canvas')
	const input = new Input(canvas)
	const renderer = new Renderer(canvas, { pixelDensity: devicePixelRatio })
	const world = new World()
	const demo = new Demo()
	const sceneManager = new SceneManager()
	const gui = new dat.GUI()

	// GUI
	{
		const statusGui = gui.addFolder('Status')
		const debugGui = gui.addFolder('Render')
		const worldGui = gui.addFolder('World')
		const sceneGui = gui.addFolder('Scene')

		for (const key of Object.keys(status)) statusGui.add(status, key).listen()
		for (const key of Object.keys(debugs)) debugGui.add(debugs, key)

		worldGui.add(world, 'substeps', 1, 10, 1)
		worldGui.add(world, 'primaryIterations', 1, 20, 1).name('primary')
		worldGui.add(world, 'secondaryIterations', 1, 10, 1).name('secondary')
		worldGui.add(world, 'useBlockSolver').name('block solver')
		worldGui.add(world, 'useSleeping').name('sleeping')

		sceneGui
			.add(sceneManager, 'scene', sceneManager.sceneList())
			.onChange(scene => sceneManager.load(scene, world))
		sceneGui.add(sceneManager, 'restart')
		sceneGui.open()
	}

	// Events
	{
		input.on('down', (x, y) => demo.onDown(renderer.point(x, y)))
		input.on('move', (dx, dy) => demo.onMove(renderer.delta(dx, dy)))
		input.on('up', () => demo.onUp())
		renderer.sync(input) // Pan Rotate Zoom Resize
	}

	// Loop
	{
		const step = 1 / 60
		let last = performance.now()
		let accu = 0

		const loop = now => {
			const dt = (now - last) * 0.001
			last = now
			accu += dt

			if (accu >= step) {
				world.simulate(step)
				demo.update(dt, step)
				world.render(renderer, debugs)
				status.bodies = world.bodies.length
				status.contacts = world.contacts.size
				status.joints = world.joints.size
				status.fps = 1 / dt
				accu = 0
			}

			requestAnimationFrame(loop)
		}

		demo.setup(world)
		sceneManager.load('Pyramid', world)
		requestAnimationFrame(loop)
	}
})
