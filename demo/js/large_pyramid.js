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
    velocityIterations: 10,
    positionIterations: 2,
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

  const debugColor = "lightgray"
  const islandColors = [
    "#ef4444", // Red
    "#3b82f6", // Blue
    "#22c55e", // Green
    "#eab308", // Yellow
    "#a855f7", // Purple
    "#f97316", // Orange
    "#14b8a6", // Teal
    "#ec4899", // Pink
    "#84cc16", // Lime
    "#06b6d4", // Cyan
    "#6366f1", // Indigo
    "#f43f5e", // Rose
    "#10b981", // Emerald
    "#8b5cf6", // Violet
    "#d946ef", // Fuchsia
    "#0ea5e9" // Sky
  ]

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

  let grabJoint = null

  input.onDown = (x, y) => {
    const centerX = canvas.width * 0.5
    const centerY = canvas.height * 0.5
    const x0 = (x - centerX) / camera.scale
    const y0 = (y - centerY) / camera.scale

    const grabX = camera.x + (x0 * camera.cos + y0 * camera.sin)
    const grabY = camera.y + (-x0 * camera.sin + y0 * camera.cos)

    const query = world.queryPoint(grabX, grabY)

    for (let i = 0; i < query.length; ++i) {
      const body = query[i]

      if (body.testPoint(grabX, grabY)) {
        if (grabJoint) {
          world.destroyJoint(grabJoint)
        }

        grabJoint = new s2.GrabJoint(body, grabX, grabY, {
          hertz: 5,
          zeta: 1
        })

        world.createJoint(grabJoint)
        break
      }
    }
  }
  input.onMove = (dx, dy, x, y) => {
    const worldDx = dx * camera.cos + dy * camera.sin
    const worldDy = -dx * camera.sin + dy * camera.cos

    if (grabJoint) {
      grabJoint.target.x += worldDx / camera.scale
      grabJoint.target.y += worldDy / camera.scale
    }
  }
  input.onUp = () => {
    if (grabJoint) {
      world.destroyJoint(grabJoint)
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
  perimetersFolGUI.add(world, "velocityIterations", 1, 20, 1)
  perimetersFolGUI.add(world, "positionIterations", 1, 10, 1)
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
        if (debugs.hide_Bodies) continue

        const fillColor = debugs.velocity
          ? body.velocityColor
          : body.isSleeping
            ? "gray"
            : body.isStatic
              ? "gray"
              : islandColors[body.islandId % islandColors.length]
        const strokeColor = debugs.velocity
          ? body.velocityColor
          : body.isSleeping
            ? "dimgray"
            : body.isStatic
              ? "dimgray"
              : islandColors[body.islandId % islandColors.length]

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
        }
      }
    }

    for (let i = 0; i < world.contactKeys.length; ++i) {
      const { bodyA, bodyB, normalX, normalY, contactPoints } =
        world.contacts.get(world.contactKeys[i])

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

    for (let i = 0; i < world.jointKeys.length; ++i) {
      const joint = world.joints.get(world.jointKeys[i])

      if (joint.type == "GrabJoint") {
        const cos = joint.body.cos
        const sin = joint.body.sin
        const anchorX = joint.anchorX * cos - joint.anchorY * sin
        const anchorY = joint.anchorX * sin + joint.anchorY * cos

        gfx.drawLine(
          joint.body.position.x + anchorX,
          joint.body.position.y + anchorY,
          joint.target.x,
          joint.target.y,
          {
            strokeColor: debugColor,
            strokeWidth
          }
        )
        continue
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
