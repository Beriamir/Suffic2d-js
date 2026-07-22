import s2 from "../../src/index.js"
import dat from "../../lib/dat.gui.mjs"
import Scenes from "./Scenes.js"
import Input from "./Input.js"
import Graphics from "./Graphics.js"
import Camera from "./Camera.js"

document.addEventListener("DOMContentLoaded", _ => {
  const canvas = document.getElementById("canvas")
  const gfx = new Graphics(canvas, {})
  const camera = new Camera(0, 0, 0, 100) // x, y, angle, scale
  const input = new Input(canvas)
  const gui = new dat.GUI()

  const statsFolGUI = gui.addFolder("Stats")
  const debugsFolGUI = gui.addFolder("Debugs")
  const perimetersFolGUI = gui.addFolder("Perimeters")

  const world = new s2.World({
    substeps: 1,
    velocityIterations: 8,
    positionIterations: 3,
    nodeMargin: 0.1,
    gravity: new s2.Vector(0, 9.81)
  })
  const debugs = {
    hide_Bodies: false,
    wireframe: false,
    epa: false,
    normal: false,
    point: false,
    impulse: false,
    velocity: false,
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
      const cx = 15 * 0.24
      const by = 0

      world.clear()
      Scenes.pyramid(s2, world, {
        rows: 15,
        spacing: 0.02,
        boxWidth: 0.24,
        boxHeight: 0.24,
        groundWidth: 10,
        groundHeight: 0.5,
        centerX: cx,
        bottomY: by
      })
    },
    vertical_Stack() {
      const cx = 15 * 0.24
      const by = 0

      world.clear()
      Scenes.verticalStack(s2, world, {
        columns: 15,
        rows: 15,
        spacing: 0.05,
        boxWidth: 0.24,
        boxHeight: 0.24,
        groundWidth: 10,
        groundHeight: 0.5,
        centerX: cx,
        bottomY: by
      })
    },
    circle_Stack() {
      const cx = 15 * 0.24
      const by = 0

      world.clear()
      Scenes.circleStack(s2, world, {
        columns: 15,
        rows: 15,
        spacing: 0.05,
        radius: 0.24,
        groundWidth: 10,
        groundHeight: 0.5,
        centerX: cx,
        bottomY: by
      })
    },
    capsule_Stack() {
      const cx = 15 * 0.24
      const by = 0

      world.clear()
      Scenes.capsuleStack(s2, world, {
        columns: 15,
        rows: 8,
        spacing: 0.05,
        length: 0.48,
        radius: 0.24,
        groundWidth: 10,
        groundHeight: 0.5,
        centerX: cx,
        bottomY: by
      })
    },
    jenga() {
      const cx = 0
      const by = 0

      world.clear()
      Scenes.jenga(s2, world, {
        levels: 15,
        width: 0.5,
        height: 0.1,
        groundWidth: 15,
        groundHeight: 0.5,
        centerX: cx,
        bottomY: by
      })
    },
    restitution() {
      const cx = 15 * 0.24
      const by = 0

      world.clear()
      Scenes.restitution(s2, world, {
        rows: 1,
        spacing: 0.24,
        radius: 0.24,
        groundWidth: 10,
        groundHeight: 0.5,
        centerX: cx,
        bottomY: by
      })
    },
    friction() {
      const cx = 6 * 0.48
      const by = 0

      world.clear()
      Scenes.friction(s2, world, {
        spacing: 0.48 * 3,
        rampWidth: 10,
        rampHeight: 0.1,
        groundWidth: 30,
        groundHeight: 0.5,
        centerX: cx,
        bottomY: by
      })
    },
    line_Shape() {
      world.clear()
      Scenes.lineShapes(s2, world, {
        count: 200,
        size: 0.24,
        groundWidth: 20,
        groundHeight: 0.5,
        centerX: 0,
        bottomY: 0.5
      })
    },
    mix_Shapes() {
      world.clear()
      Scenes.mixShapes(s2, world, {
        count: 200,
        size: 0.24,
        groundWidth: 20,
        groundHeight: 0.5,
        centerX: 0,
        bottomY: 0.5
      })
    },
    reset_Camera() {
      camera.x = 0
      camera.y = 0
      camera.angle = 0
      camera.scale = 100
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
  input.onResize = (w, h) => {
    canvas.width = w
    canvas.height = h
  }

  for (const stat of Object.keys(stats)) {
    statsFolGUI.add(stats, stat).listen().name(stat.toUpperCase())
  }

  for (const stat of Object.keys(camera)) {
    statsFolGUI.add(camera, stat).listen().name(stat.toUpperCase())
  }

  for (const debug of Object.keys(debugs)) {
    debugsFolGUI.add(debugs, debug).name(debug.toUpperCase())
  }

  perimetersFolGUI.add(world, "substeps", 1, 10, 1)
  perimetersFolGUI.add(world, "velocityIterations", 1, 10, 1)
  perimetersFolGUI.add(world, "positionIterations", 1, 10, 1)

  for (const key of Object.keys(sceneManager)) {
    gui.add(sceneManager, key).name(key.toUpperCase())
  }

  function setup() {
    canvas.width = innerWidth
    canvas.height = innerHeight
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
        if (debugs.hide_Bodies) continue

        const fillColor = debugs.velocity
          ? body.velocityColor
          : body.isSleeping
            ? "gray"
            : s.fillColor
        const strokeColor = debugs.velocity
          ? body.velocityColor
          : body.isSleeping
            ? "dimgray"
            : s.strokeColor

        switch (s.type) {
          case "polygon":
            gfx.drawPolygon(position.x, position.y, cos, sin, {
              offsetX: s.offset.x,
              offsetY: s.offset.y,
              cos: s.cos,
              sin: s.sin,
              vertices: s.vertices,
              fillColor,
              strokeColor,
              wireframe: debugs.wireframe,
              noStroke: !debugs.wireframe,
              strokeWidth
            })
            break
          case "circle":
            gfx.drawCircle(position.x, position.y, cos, sin, {
              offsetX: s.offset.x,
              offsetY: s.offset.y,
              cos: s.cos,
              sin: s.sin,
              radius: s.radius,
              fillColor,
              strokeColor,
              wireframe: debugs.wireframe,
              noStroke: !debugs.wireframe,
              strokeWidth
            })
            break
          case "capsule":
            gfx.drawCapsule(position.x, position.y, cos, sin, {
              offsetX: s.offset.x,
              offsetY: s.offset.y,
              cos: s.cos,
              sin: s.sin,
              length: s.length,
              radius: s.radius,
              fillColor,
              strokeColor,
              wireframe: debugs.wireframe,
              noStroke: !debugs.wireframe,
              strokeWidth
            })
            break
          case "line":
            gfx.drawLine(s.center1.x, s.center1.y, s.center2.x, s.center2.y, {
              strokeColor,
              strokeWidth
            })
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
        normalX,
        normalY,
        ref,
        inc,
        overlap,
        polytope,
        contactPoints
      } = contact

      if (debugs.epa && polytope) {
        const originX = 0
        const originY = 0
        const mtvX = normalX * overlap
        const mtvY = normalY * overlap

        gfx.drawPolygon(originX, originY, 1, 0, {
          vertices: polytope,
          wireframe: true,
          strokeColor: debugColor,
          strokeWidth
        })
        gfx.drawLine(originX, originY, mtvX, mtvY, {
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
        gfx.drawLine(ref.edge[0], ref.edge[1], ref.edge[2], ref.edge[3], {
          strokeColor: debugColor,
          strokeWidth
        })
      }

      if (debugs.inc && inc) {
        gfx.drawLine(inc.edge[0], inc.edge[1], inc.edge[2], inc.edge[3], {
          strokeColor: debugColor,
          strokeWidth
        })
      }

      for (const cp of contactPoints) {
        if (debugs.impulse) {
          gfx.drawNormal(cp.pointX, cp.pointY, normalX, normalY, {
            length: cp.normalImpulse,
            showHead: false,
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
  }

  function update() {
    const step = 1 / 60
    let last = performance.now()

    const loop = now => {
      const dt = (now - last) * 0.001
      last = now

      simulate(step)
      render(gfx)
      stats.fps = 1 / dt
      stats.bodies = world.bodies.length
      stats.joints = 0

      requestAnimationFrame(loop)
    }

    requestAnimationFrame(loop)
  }

  setup()
  update()
})
