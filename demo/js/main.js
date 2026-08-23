import { Renderer, Input, World } from '../../src/suffic2d.js'
import dat from '../../lib/dat.gui.js'
import Demo from './Demo.js'

document.addEventListener('DOMContentLoaded', () => {
	const canvas = document.getElementById('canvas')
	const renderer = new Renderer(canvas, {
		resolution: devicePixelRatio ?? 1
	})
	const input = new Input(canvas)
	const world = new World()
	const demo = new Demo(world)
	const gui = new dat.GUI()
	const status = {
		fps: 0,
		bodies: 0,
		contacts: 0,
		joints: 0
	}

	// Setup GUI
	{
		const statusGui = gui.addFolder('Status')
		const renderGui = gui.addFolder('Render')
		const worldGui = gui.addFolder('World')

		for (const key of Object.keys(status)) {
			statusGui.add(status, key).listen()
		}

		for (const key of renderer.debugList()) {
			renderGui.add(renderer.debugs, key)
		}

		worldGui.add(world, 'substeps', 1, 10, 1)
		worldGui.add(world, 'primaryIterations', 1, 20, 1).name('primary')
		worldGui.add(world, 'secondaryIterations', 1, 10, 1).name('secondary')
		worldGui.add(world, 'useBlockSolver').name('block solver')
		worldGui.add(world, 'useSleeping').name('sleeping')
		worldGui
			.add(demo, 'scene', demo.sceneList())
			.onChange(scene => demo.load(scene))
			.name('Scene')
		worldGui.add(demo, 'load').name('Restart')
		worldGui.open()
	}

	// Setup events
	{
		input.onDown = (x, y) => {
			const [pointX, pointY] = renderer.onDown(x, y)

			demo.onDown(pointX, pointY)
		}
		input.onMove = (dx, dy) => {
			const [moveX, moveY] = renderer.onMove(dx, dy)

			demo.onMove(moveX, moveY)
		}
		input.onUp = () => {
			demo.onUp()
		}
		input.onPan = (dx, dy) => renderer.pan(dx, dy)
		input.onZoom = factor => renderer.zoom(factor)
		input.onRotate = delta => renderer.rotate(delta)
		input.onResize = (w, h) => renderer.resize(w, h)
	}

	demo.initialize()

	// Animation loop
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
				demo.update(dt)

				status.bodies = world.bodies.length
				status.contacts = world.contacts.size
				status.joints = world.joints.size
				status.fps = 1 / dt

				renderer.draw(world)
				accu -= step
			}
			requestAnimationFrame(loop)
		}

		requestAnimationFrame(loop)
	}
})
