import s2 from '../../src/index.js'
import dat from '../../lib/dat.gui.mjs'
import scenes from './scenes.js'
import status from './status.js'

document.addEventListener('DOMContentLoaded', () => {
  const s2Renderer = new s2.Renderer(document.getElementById('canvas'))
  const s2World = new s2.World()
  const gui = new dat.GUI()

  // Grab
  {
    let s2GrabJoint = null

    s2Renderer.onDown = (x, y) => {
      const query = s2World.queryPoint(x, y)

      for (let i = 0; i < query.length; ++i) {
        const body = query[i]

        if (!body.testPoint(x, y)) {
          continue
        }

        if (s2GrabJoint) {
          s2World.destroyJoint(s2GrabJoint)
        }

        s2GrabJoint = new s2.GrabJoint(body, x, y, {
          length: 0,
          hertz: 5,
          zeta: 1,
          friction: 0.3
        })

        s2World.createJoint(s2GrabJoint)
        break
      }
    }
    s2Renderer.onMove = (dx, dy, x, y) => {
      if (!s2GrabJoint) {
        return
      }

      s2GrabJoint.target.x += dx
      s2GrabJoint.target.y += dy
    }
    s2Renderer.onUp = () => {
      if (!s2GrabJoint) {
        return
      }

      s2World.destroyJoint(s2GrabJoint)
    }
  }

  // GUI
  {
    const statusGui = gui.addFolder('Status')
    const renderGui = gui.addFolder('Render')
    const s2WorldGui = gui.addFolder('s2World')
    
    for (const key of Object.keys(status)) {
      if (key === 'scene') {
        continue
      }
  
      statusGui.add(status, key).listen()
    }
    
    for (const key of Object.keys(s2Renderer)) {
      if (
        key === null || 
        key === 'debugsColor' || 
        typeof s2Renderer[key] === 'object' ||
        typeof s2Renderer[key] === 'function'
      ) {
        continue
      }
      
      renderGui.add(s2Renderer, key)
    }
    
    s2WorldGui.add(s2World, 'substeps', 1, 10, 1)
    s2WorldGui.add(s2World, 'primaryIterations', 1, 20, 1).name('primary')
    s2WorldGui.add(s2World, 'secondaryIterations', 1, 10, 1).name('secondary')
    s2WorldGui.add(s2World, 'useBlockSolver').name('block solver')
    s2WorldGui.add(s2World, 'useSleeping').name('sleeping')
    s2WorldGui
      .add(status, 'scene', [...Object.keys(scenes)])
      .onChange(switchScene)
      .name('Scene')
    s2WorldGui
      .add({ restart: () => switchScene(status.scene) }, 'restart')
      .name('Restart')
    s2WorldGui.open()
  }

  function switchScene(scene) {
    scenes[scene](s2, s2World)
  }

  function setup() {
    switchScene(status.scene)
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
