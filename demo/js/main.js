import { Renderer, Input, World } from '../../src/suffic2d.js'
import dat from '../../lib/dat.gui.js'
import Demo from './Demo.js'

document.addEventListener('DOMContentLoaded', () => {
	const canvas = document.getElementById('canvas')
	const renderer = new Renderer(canvas, { resolution: devicePixelRatio })
	const input = new Input(canvas)
	const world = new World()
	const demo = new Demo(world)
	const gui = new dat.GUI()

	// Setup GUI
	{
		const statusGui = gui.addFolder('Status')
		const renderGui = gui.addFolder('Render')
		const worldGui = gui.addFolder('World')

		for (const key of renderer.statusList()) {
			statusGui.add(renderer.status, key).listen()
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
		worldGui.add(demo, 'load').name('restart')
		worldGui.open()
	}

	// Setup events
	{
		input.onDown = (x, y) => {
			demo.onDown(...renderer.onDown(x, y))
		}
		input.onMove = (dx, dy) => {
			demo.onMove(...renderer.onMove(dx, dy))
		}
		input.onUp = () => {
			demo.onUp()
		}
		input.onPan = (dx, dy) => renderer.pan(dx, dy)
		input.onZoom = factor => renderer.zoom(factor)
		input.onRotate = delta => renderer.rotate(delta)
		input.onResize = (w, h) => renderer.resize(w, h)
	}

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
			renderer.draw(world, dt)
			accu -= step
		}

		requestAnimationFrame(loop)
	}

	demo.initialize()
	requestAnimationFrame(loop)
})
