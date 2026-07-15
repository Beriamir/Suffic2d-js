import s2 from "../../src/index.js"
import dat from "../../lib/dat.gui.mjs"
import scenes from "./scenes/scenes.js"
import Input from "./inputs/Input.js"
import Graphics from "./Graphics.js"
import Camera from "./Camera.js"

document.addEventListener("DOMContentLoaded", _ => {
  const canvas = document.getElementById("canvas")
  const guiEl = document.getElementById("gui")

  const gfx = new Graphics(canvas, {})
  const camera = new Camera(0, 0, 0, 100) // x, y, angle, scale
  const input = new Input(canvas)
  const gui = new dat.GUI({
    autoPlace: false,
    hideable: true
  })

  const statsFolGUI = gui.addFolder("Stats")
  const debugsFolGUI = gui.addFolder("Debugs")
  const perimetersFolGUI = gui.addFolder("Perimeters")

  const world = new s2.World({
    substeps: 1,
    velocityIterations: 4,
    positionIterations: 2,
    nodeMargin: 0.1,
    gravity: new s2.Vector(0, 9.81)
  })
  const debugs = {
    wireframe: false,
    epa: false,
    normal: false,
    point: false,
    impulse: false,
    ref: false,
    inc: false,
    aabb: false,
    bvh: false
  }
  const stats = {
    fps: 0,
    bodies: 0,
    joints: 0
  }

  const sceneManager = {
    pyramid() {
      const cx = 7.5 * 0.48
      const by = 0

      world.clear()
      scenes.pyramid(s2, world, {
        rows: 15,
        spacing: 0,
        boxWidth: 0.48,
        boxHeight: 0.48,
        groundWidth: 20,
        groundHeight: 0.1,
        centerX: cx,
        bottomY: by
      })
    },
    boxStack() {
      const cx = 12 * 0.24
      const by = 0

      world.clear()
      scenes.boxStack(s2, world, {
        columns: 12,
        rows: 12,
        spacing: 0,
        boxWidth: 0.48,
        boxHeight: 0.48,
        groundWidth: 20,
        groundHeight: 0.1,
        centerX: cx,
        bottomY: by
      })
    },
    circleStack() {
      const cx = 12 * 0.24
      const by = 0

      world.clear()
      scenes.circleStack(s2, world, {
        columns: 12,
        rows: 12,
        spacing: 0,
        radius: 0.24,
        groundWidth: 20,
        groundHeight: 0.1,
        centerX: cx,
        bottomY: by
      })
    },
    jenga() {
      const cx = 4.5
      const by = 0

      world.clear()
      scenes.jenga(s2, world, {
        levels: 13,
        width: 1,
        height: 0.2,
        groundWidth: 20,
        groundHeight: 0.1,
        centerX: cx,
        bottomY: by
      })
    },
    friction() {
      const cx = 6 * 0.48
      const by = 0

      world.clear()
      scenes.friction(s2, world, {
        spacing: 0.48 * 3,
        rampWidth: 10,
        rampHeight: 0.1,
        groundWidth: 50,
        groundHeight: 0.1,
        centerX: cx,
        bottomY: by
      })
    }
  }

  input.onPan = (dx, dy) => {
    camera.move(dx, dy)
  }
  input.onZoom = factor => {
    camera.zoom(factor)
  }
  input.onRotate = delta => {
    camera.rotate(delta)
  }

  for (const stat of Object.keys(stats)) {
    statsFolGUI.add(stats, stat).listen().name(stat.toUpperCase())
  }

  for (const key of Object.keys(debugs)) {
    debugsFolGUI.add(debugs, key).name(key.toUpperCase())
  }

  perimetersFolGUI.add(world, "substeps", 1, 10, 1)
  perimetersFolGUI.add(world, "velocityIterations", 1, 10, 1)
  perimetersFolGUI.add(world, "positionIterations", 1, 10, 1)

  gui.add(sceneManager, "pyramid")
  gui.add(sceneManager, "boxStack")
  gui.add(sceneManager, "circleStack")
  gui.add(sceneManager, "jenga")
  gui.add(sceneManager, "friction")

  guiEl.appendChild(gui.domElement)

  window.addEventListener("resize", e => {
    windowResize(innerWidth, innerHeight)
  })

  function windowResize(width, height) {
    canvas.width = width
    canvas.height = height
  }

  function setup() {
    windowResize(innerWidth, innerHeight)
    sceneManager.pyramid()
  }

  function simulate(dt) {
    world.simulate(dt)
  }

  function render(gfx) {
    gfx.clear(0, 0, canvas.width, canvas.height)
    gfx.setCamera(camera)

    const strokeWidth = 1 / camera.scale
    const debugColor = "lightgray"

    for (let i = 0; i < world.bodies.length; ++i) {
      const body = world.bodies[i]
      const { position, cos, sin } = body

      for (const s of body.fixtures) {
        switch (s.type) {
          case "polygon":
            gfx.drawPolygon(position.x, position.y, cos, sin, {
              offsetX: s.offsetX,
              offsetY: s.offsetY,
              cos: s.cos,
              sin: s.sin,
              vertices: s.vertices,
              fillColor: body.isSleeping ? "gray" : s.fillColor,
              strokeColor: body.isSleeping ? "dimgray" : s.strokeColor,
              wireframe: debugs.wireframe,
              noStroke: !debugs.wireframe,
              strokeWidth
            })
            break

          case "circle":
            gfx.drawCircle(position.x, position.y, cos, sin, {
              offsetX: s.offsetX,
              offsetY: s.offsetY,
              cos: s.cos,
              sin: s.sin,
              radius: s.radius,
              fillColor: body.isSleeping ? "gray" : s.fillColor,
              strokeColor: body.isSleeping ? "dimgray" : s.strokeColor,
              wireframe: debugs.wireframe,
              noStroke: !debugs.wireframe,
              strokeWidth
            })
            break

          default:
            break
        }
      }
    }

    if (debugs.aabb) {
      for (let i = 0; i < world.bodies.length; ++i) {
        const body = world.bodies[i]
        gfx.drawAABB(body.aabb, {
          strokeColor: debugColor,
          wireframe: true,
          strokeWidth
        })
      }
    }

    if (debugs.bvh) {
      world.dynamicTree.traverse(node => {
        gfx.drawAABB(node.aabb, {
          strokeColor: debugColor,
          wireframe: true,
          strokeWidth
        })
      })
    }

    for (let i = 0; i < world.contactKeys.length; ++i) {
      const key = world.contactKeys[i]
      const contact = world.contacts.get(key)
      const {
        bodyA,
        bodyB,
        manifold: {
          normalX,
          normalY,
          ref,
          inc,
          overlap,
          polytope,
          contactPoints
        }
      } = contact

      if (debugs.epa && polytope) {
        const originX = 0
        const originY = 0
        const mtv = new Float32Array(4)

        mtv[0] = 0
        mtv[1] = 0
        mtv[2] = normalX * overlap
        mtv[3] = normalY * overlap

        gfx.drawPolygon(originX, originY, 1, 0, {
          vertices: polytope,
          wireframe: true,
          strokeColor: debugColor,
          strokeWidth
        })
        gfx.drawLine(originX, originY, 1, 0, {
          vertices: mtv,
          strokeColor: debugColor,
          strokeWidth
        })
        gfx.drawCircle(originX, originY, 1, 0, {
          radius: 2 / camera.scale,
          fillColor: debugColor,
          noStroke: true
        })
      }

      if (debugs.ref && ref) {
        gfx.drawLine(0, 0, 1, 0, {
          vertices: ref.edge,
          strokeColor: debugColor,
          strokeWidth
        })
      }

      if (debugs.inc && inc) {
        gfx.drawLine(0, 0, 1, 0, {
          vertices: inc.edge,
          strokeColor: debugColor,
          strokeWidth
        })
      }

      for (const cp of contactPoints) {
        const nImpulse = new Float32Array(4)

        nImpulse[0] = 0
        nImpulse[1] = 0
        nImpulse[2] = normalX * cp.normalImpulse
        nImpulse[3] = normalY * cp.normalImpulse

        if (debugs.impulse) {
          gfx.drawLine(cp.pointX, cp.pointY, 1, 0, {
            vertices: nImpulse,
            strokeColor: debugColor,
            strokeWidth
          })
        }

        if (debugs.point) {
          gfx.drawCircle(cp.pointX, cp.pointY, 1, 0, {
            radius: 1.5 / camera.scale,
            fillColor: debugColor,
            noStroke: true,
            strokeWidth
          })
        }

        if (debugs.normal) {
          gfx.drawNormal(cp.pointX, cp.pointY, normalX, normalY, {
            length: 8 / camera.scale,
            strokeColor: debugColor,
            strokeWidth
          })
        }
      }
    }

    gfx.setCamera(null)

    // GUID
  }

  function update() {
    let last = performance.now()
    let accu = 0
    const step = 1 / 60

    const loop = now => {
      const dt = (now - last) * 0.001

      last = now
      accu += dt
      if (accu >= step) {
        simulate(step)
        render(gfx, step)

        accu -= step
        stats.fps = 1 / dt
        stats.bodies = world.bodies.length
        stats.joints = 0
      }

      requestAnimationFrame(loop)
    }

    requestAnimationFrame(loop)
  }

  setup()
  update()
})
