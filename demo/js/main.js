import s2 from '../../src/index.js'
import dat from '../../lib/dat.gui.mjs'
import SceneManager from './SceneManager.js'

document.addEventListener('DOMContentLoaded', () => {
	const renderer = new s2.Renderer(document.getElementById('canvas'))
	const world = new s2.World()
	const sceneManager = new SceneManager(s2, world)
	const gui = new dat.GUI()

	const status = {
		fps: 0,
		bodies: 0,
		contacts: 0,
		joints: 0
	}

	// Grab
	{
		const s2GrabJoint = new s2.GrabJoint(0, 0, null, {
			damping: 0.3,
			stiffness: 0.1
		})

		renderer.onDown = (x, y) => {
			for (const body of world.queryPoint(x, y)) {
				if (body.testPoint(x, y)) {
					s2GrabJoint.set(x, y, body)
					world.createJoint(s2GrabJoint)
					break
				}
			}
		}
		renderer.onMove = (dx, dy) => s2GrabJoint.move(dx, dy)
		renderer.onUp = () => world.destroyJoint(s2GrabJoint)
	}

	// GUI
	{
		const statusGui = gui.addFolder('Status')
		const renderGui = gui.addFolder('Render')
		const worldGui = gui.addFolder('World')

		for (const key of Object.keys(status)) {
			statusGui.add(status, key).listen()
		}

		for (const key of renderer.getDebugList()) {
			renderGui.add(renderer.debugs, key)
		}

		worldGui.add(world, 'substeps', 1, 10, 1)
		worldGui.add(world, 'primaryIterations', 1, 20, 1).name('primary')
		worldGui.add(world, 'secondaryIterations', 1, 10, 1).name('secondary')
		worldGui.add(world, 'useBlockSolver').name('block solver')
		worldGui.add(world, 'useSleeping').name('sleeping')
		worldGui
			.add(sceneManager, 'scene', sceneManager.getList())
			.onChange(scene => sceneManager.switch(scene))
			.name('Scene')
		worldGui.add(sceneManager, 'restart').name('Restart')
		worldGui.open()
	}

	function setup() {
		const step = 1 / 60
		let last = performance.now()

		// Initial scene
		sceneManager.switch(sceneManager.scene)

		const update = now => {
			const dt = now - last
			last = now

			world.simulate(step)
			renderer.draw(world)

			status.fps = 1000 / dt
			status.bodies = world.bodies.length
			status.contacts = world.contacts.size
			status.joints = world.joints.size

			requestAnimationFrame(update)
		}

		requestAnimationFrame(update)
	}

	setup()
})
