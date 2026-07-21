import s2 from "../../src/index.js"
import dat from "../../lib/dat.gui.mjs"
import Input from "./Input.js"
import Graphics from "./Graphics.js"
import Camera from "./Camera.js"
import Shapes from "./Shapes.js"

document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("canvas")
  const gfx = new Graphics(canvas)
  const camera = new Camera(0, 0, 0, 100) // x, y, angle, scale
  const input = new Input(canvas)
  const gui = new dat.GUI()

  const world = new s2.World({
    substeps: 1,
    velocityIterations: 8,
    positionIterations: 3,
    nodeMargin: 0.1
  })

  const debugs = {
    wireframe: false,
    normal: false,
    point: false,
    impulse: false
  }
  const stats = {
    fps: 0,
    bodies: 0
  }
  const sceneManager = {
    rows: 15,
    restart() {
      world.clear()

      const spacing = 0.024,
        boxWidth = 0.24,
        boxHeight = 0.24,
        groundWidth = 50,
        groundHeight = 0.24,
        centerX = 0,
        bottomY = 0

      const groundX = centerX
      const groundY = bottomY + groundHeight
      const ground = new s2.RigidBody(groundX, groundY, 0, {
        isStatic: true
      })

      ground.createPolygon(Shapes.rectangle(groundWidth, groundHeight), {
        fillColor: "gray",
        strokeColor: "dimgray"
      })
      world.createBody(ground)

      const colStep = boxWidth * 2 + spacing
      const rowStep = boxHeight * 2 + spacing

      for (let row = 0; row < sceneManager.rows; ++row) {
        const count = sceneManager.rows - row
        const startX = centerX - (count - 1) * colStep * 0.5
        const y = bottomY - boxHeight - row * rowStep

        for (let col = 0; col < count; ++col) {
          const x = startX + col * colStep
          const body = new s2.RigidBody(x, y, 0, {
            friction: 0.3
          })

          body.createPolygon(Shapes.rectangle(boxWidth, boxHeight), {})
          world.createBody(body)
        }
      }
    },
    reset_Camera() {
      camera.x = 0
      camera.y = 0
      camera.angle = 0
      camera.scale = 100
    }
  }

  const statsFolGUI = gui.addFolder("Stats")
  const debugsFolGUI = gui.addFolder("Debugs")
  const perimetersFolGUI = gui.addFolder("Perimeters")

  for (const stat of Object.keys(stats)) {
    statsFolGUI.add(stats, stat).listen().name(stat.toUpperCase())
  }

  for (const debug of Object.keys(debugs)) {
    debugsFolGUI.add(debugs, debug).name(debug.toUpperCase())
  }

  perimetersFolGUI.add(world, "substeps", 1, 10, 1)
  perimetersFolGUI.add(world, "velocityIterations", 1, 32, 1)
  perimetersFolGUI.add(world, "positionIterations", 1, 32, 1)
  perimetersFolGUI.add(sceneManager, "rows", 1, 100, 1)

  for (const key of Object.keys(sceneManager)) {
    if (key == "rows") continue
    gui.add(sceneManager, key).name(key.toUpperCase())
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

  function setup() {
    canvas.width = innerWidth
    canvas.height = innerHeight
    sceneManager.restart()
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
        gfx.drawPolygon(position.x, position.y, cos, sin, {
          offsetX: s.offset.x,
          offsetY: s.offset.y,
          cos: s.cos,
          sin: s.sin,
          vertices: s.vertices,
          fillColor: s.fillColor,
          strokeColor: s.strokeColor,
          wireframe: debugs.wireframe,
          noStroke: !debugs.wireframe,
          strokeWidth
        })
      }
    }

    for (let i = 0; i < world.contactKeys.length; ++i) {
      const { bodyA, bodyB, normalX, normalY, contactPoints } =
        world.contacts.get(world.contactKeys[i])

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
