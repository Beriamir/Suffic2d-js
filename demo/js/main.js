import s2 from '../../src/index.js'
import dat from '../../lib/dat.gui.mjs'
import SceneManager from './SceneManager.js'

document.addEventListener('DOMContentLoaded', () => {
  const s2Renderer = new s2.Renderer(document.getElementById('canvas'))
  const s2World = new s2.World()
  const sceneManager = new SceneManager(s2, s2World)
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

    s2Renderer.onDown = (x, y) => {
      for (const body of s2World.queryPoint(x, y)) {
        if (body.testPoint(x, y)) {
          s2GrabJoint.set(x, y, body)
          s2World.createJoint(s2GrabJoint)
          break
        }
      }
    }
    s2Renderer.onMove = (dx, dy, x, y) => {
      s2GrabJoint.move(dx, dy)
    }
    s2Renderer.onUp = () => {
      s2World.destroyJoint(s2GrabJoint)
    }
  }

  // GUI
  {
    const statusGui = gui.addFolder('Status')
    const renderGui = gui.addFolder('Render')
    const worldGui = gui.addFolder('World')
    
    for (const key of Object.keys(status)) {
      statusGui.add(status, key).listen()
    }
    
    for (const key of s2Renderer.getDebugList()) {
      renderGui.add(s2Renderer.debugs, key)
    }
    
    worldGui.add(s2World, 'substeps', 1, 10, 1)
    worldGui.add(s2World, 'primaryIterations', 1, 20, 1).name('primary')
    worldGui.add(s2World, 'secondaryIterations', 1, 10, 1).name('secondary')
    worldGui.add(s2World, 'useBlockSolver').name('block solver')
    worldGui.add(s2World, 'useSleeping').name('sleeping')
    worldGui
      .add(sceneManager, 'scene', sceneManager.getList())
      .onChange(scene => sceneManager.switch(scene))
      .name('Scene')
    worldGui
      .add(sceneManager, 'restart')
      .name('Restart')
    worldGui.open()
  }

  function setup() {
    sceneManager.switch(sceneManager.scene)
  }

  function update() {
    const step = 1 / 60
    let last = performance.now()

    const loop = now => {
      const dt = (now - last) * 0.001
      last = now

      s2World.simulate(step)
      s2Renderer.draw(s2World)

      status.fps = 1 / dt
      status.bodies = s2World.bodies.length
      status.contacts = s2World.contacts.size
      status.joints = s2World.joints.size

      requestAnimationFrame(loop)
    }

    requestAnimationFrame(loop)
  }

  setup()
  update()
})
