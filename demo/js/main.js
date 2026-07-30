import s2 from "../../src/index.js"
import dat from "../../lib/dat.gui.mjs"
import scenes from "./scenes.js"
import debugs from "./debugs.js"

import Input from "./navigation/Input.js"
import Graphics from "./render/Graphics.js"
import Camera from "./render/Camera.js"

document.addEventListener("DOMContentLoaded", _ => {
  const canvas = document.getElementById("canvas")
  const gfx = new Graphics(canvas, {})
  const camera = new Camera(0, 0, 0, 100)
  const input = new Input(canvas)
  const gui = new dat.GUI({})

  const world = new s2.World({
    substeps: 1,
    primaryIterations: 10,
    secondaryIterations: 2,
    nodeMargin: 0.12,
    gravity: new s2.Vector(0, 9.81),
    useBlockSolver: true
  })

  const settings = {
    scene: "Pyramid",
    status: {
      fps: 0,
      bodies: 0,
      contacts: 0,
      joints: 0
    },
    restart: () => {
      switchScene(settings.scene)
    }
  }

  const statusFolGUI = gui.addFolder("status")
  const cameraFolGUI = gui.addFolder("Camera")
  const debugsFolGUI = gui.addFolder("Debugs")
  const worldFolGUI = gui.addFolder("World")

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

  for (const stat of Object.keys(settings.status)) {
    statusFolGUI.add(settings.status, stat).listen()
  }

  cameraFolGUI.add(camera, "reset").name("Reset")
  for (const prop of Object.keys(camera)) {
    cameraFolGUI.add(camera, prop).listen()
  }

  for (const debug of Object.keys(debugs)) {
    debugsFolGUI.add(debugs, debug)
  }

  worldFolGUI.add(world, "substeps", 1, 10, 1)
  worldFolGUI.add(world, "primaryIterations", 1, 20, 1).name("primary")
  worldFolGUI.add(world, "secondaryIterations", 1, 10, 1).name("secondary")
  worldFolGUI.add(world, "useBlockSolver").name("block solver")

  gui
    .add(settings, "scene", [...Object.keys(scenes)])
    .onChange(switchScene)
    .name("Scene")

  gui.add(settings, "restart").name("Restart")

  function switchScene(scene) {
    world.clear()
    scenes[scene](s2, world)
  }

  function setup() {
    canvas.width = innerWidth
    canvas.height = innerHeight
    settings.restart()
  }

  function simulate(dt) {
    world.simulate(dt)
  }

  function render(gfx) {
    gfx.clear(0, 0, canvas.width, canvas.height)
    gfx.setCamera(camera)

    const strokeWidth = 1 / camera.scale

    for (let i = 0; i < world.bodies.length; ++i) {
      const body = world.bodies[i]
      const { position, cos, sin } = body

      for (const s of body.fixtures) {
        if (debugs["hide bodies"]) continue

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

        for (const s of body.fixtures) {
          gfx.drawAABB(s.aabb, {
            strokeColor: debugColor,
            wireframe: true,
            strokeWidth
          })
        }

        if (body.fixtures.length <= 1) {
          continue
        }

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
      settings.status.fps = 1 / dt
      settings.status.bodies = world.bodies.length
      settings.status.contacts = world.contacts.size
      settings.status.joints = world.joints.size

      requestAnimationFrame(loop)
    }

    requestAnimationFrame(loop)
  }

  setup()
  update()
})
