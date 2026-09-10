import { Renderer, Input, World, GrabJoint } from '../../src/suffic2d.js'
import dat from '../../lib/dat.gui.js'
import SceneManager from './SceneManager.js'

document.addEventListener('DOMContentLoaded', () => {
	const canvas = document.getElementById('canvas')
	const input = new Input(canvas)
	const renderer = new Renderer(canvas, { devicePixelRatio })
	const world = new World()
	const grabJoint = new GrabJoint(0, 0, null)
	const sceneManager = new SceneManager()
	const gui = new dat.GUI()

	const debugs = {
		aabb: false,
		bvh: false,
		contact: false,
		impulse: false,
		velocity: false,
		island: true,
		fill: true,
		stroke: true
	}

	const status = {
		fps: 0,
		bodies: 0,
		contacts: 0,
		joints: 0
	}

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
			.add(sceneManager, 'scene', sceneManager.list())
			.onChange(scene => sceneManager.load(scene, world))
		sceneGui.add(sceneManager, 'restart')
		sceneGui.open()
	}

	// Events
	{
		input.on('down', (x, y) => {
			const point = renderer.point(x, y)
			const query = world.queryPoint(point.x, point.y)

			for (const body of query) {
				if (body.testPoint(point.x, point.y)) {
					grabJoint.set(point.x, point.y, body)
					world.createJoint(grabJoint)
					break
				}
			}
		})

		input.on('move', (dx, dy) => {
			const delta = renderer.delta(dx, dy)

			grabJoint.move(delta.x, delta.y)
		})

		input.on('up', () => {
			world.destroyJoint(grabJoint)
		})

		renderer.sync(input) // Pan Rotate Zoom Resize
	}

	function setup() {
		sceneManager.load('Pyramid', world)
	}

	function update(dt, step) {
		const deadBottom = 100

		for (let i = 0; i < world.bodies.length; i++) {
			const body = world.bodies[i]

			if (body.position.y >= deadBottom) {
				world.destroyBody(body)
				i--
			}
		}
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
				update(dt, step)
				world.render(renderer, debugs)

				status.bodies = world.bodies.length
				status.contacts = world.contacts.size
				status.joints = world.joints.size
				status.fps = 1 / dt

				accu = 0
			}

			requestAnimationFrame(loop)
		}

		setup()
		requestAnimationFrame(loop)
	}
})
