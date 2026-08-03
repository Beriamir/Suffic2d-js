import s2 from "../../src/index.js"
import dat from "../../lib/dat.gui.mjs"
import scenes from "./scenes.js"
import debugs from "./debugs.js"
import settings from "./settings.js"

import Input from "./navigation/Input.js"
import Graphics from "./render/Graphics.js"
import Camera from "./render/Camera.js"

document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("canvas")
  const gfx = new Graphics(canvas, {})
  const camera = new Camera(0, 0, 0, 100)
  const input = new Input(canvas)
  const gui = new dat.GUI({})

  const world = new s2.World({
    substeps: 1,
    primaryIterations: 8,
    secondaryIterations: 3,
    nodeMargin: 0.12,
    useBlockSolver: true,
    useSleeping: true
  })

  const debugColor = "lightgray"
  const islandColors = [
    "#ef4444",
    "#3b82f6",
    "#22c55e",
    "#eab308",
    "#a855f7",
    "#f97316",
    "#14b8a6",
    "#ec4899",
    "#84cc16",
    "#06b6d4",
    "#6366f1",
    "#f43f5e",
    "#10b981",
    "#8b5cf6",
    "#d946ef",
    "#0ea5e9"
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
          length: 0,
          hertz: 30,
          zeta: 10,
          friction: 0.3
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

  // GUI
  {
    const statusFolGUI = gui.addFolder("status")
    const cameraFolGUI = gui.addFolder("Camera")
    const debugsFolGUI = gui.addFolder("Debugs")
    const worldFolGUI = gui.addFolder("World")

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
    worldFolGUI.add(world, "useSleeping").name("sleeping")

    gui
      .add(settings, "scene", [...Object.keys(scenes)])
      .onChange(switchScene)
      .name("Scene")

    gui
      .add({ restart: () => switchScene(settings.scene) }, "restart")
      .name("Restart")
  }

  function switchScene(scene) {
    world.clear()
    scenes[scene](s2, world)
  }

  function setup() {
    canvas.width = innerWidth
    canvas.height = innerHeight
    switchScene(settings.scene)
  }

  function simulate(step) {
    world.simulate(step)
  }

  function render(gfx) {
    const strokeWidth = 1 / camera.scale

    gfx.clear(0, 0, canvas.width, canvas.height)
    gfx.setCamera(camera)

    // Draw bodies
    if (!debugs["hide bodies"]) {
      for (let i = 0; i < world.bodies.length; ++i) {
        const {
          position,
          cos,
          sin,
          isSleeping,
          isStatic,
          islandId,
          velocityColor,
          fixtures
        } = world.bodies[i]

        const fillColor = debugs.velocity
          ? velocityColor
          : isSleeping
            ? "gray"
            : isStatic
              ? "gray"
              : islandColors[islandId % islandColors.length]
        const strokeColor = debugs.velocity
          ? velocityColor
          : isSleeping
            ? "dimgray"
            : isStatic
              ? "dimgray"
              : islandColors[islandId % islandColors.length]

        for (const shape of fixtures) {
          switch (shape.type) {
            case "polygon":
              gfx.drawPolygon(position.x, position.y, cos, sin, {
                offsetX: shape.offset.x,
                offsetY: shape.offset.y,
                cos: shape.cos,
                sin: shape.sin,
                vertices: shape.vertices,
                fillColor,
                strokeColor,
                wireframe: debugs.wireframe,
                noStroke: !debugs.wireframe,
                strokeWidth
              })
              break
            case "circle":
              gfx.drawCircle(position.x, position.y, cos, sin, {
                offsetX: shape.offset.x,
                offsetY: shape.offset.y,
                cos: shape.cos,
                sin: shape.sin,
                radius: shape.radius,
                fillColor,
                strokeColor,
                wireframe: debugs.wireframe,
                noStroke: !debugs.wireframe,
                strokeWidth
              })
              break
            case "capsule":
              gfx.drawCapsule(position.x, position.y, cos, sin, {
                offsetX: shape.offset.x,
                offsetY: shape.offset.y,
                cos: shape.cos,
                sin: shape.sin,
                length: shape.length,
                radius: shape.radius,
                fillColor,
                strokeColor,
                wireframe: debugs.wireframe,
                noStroke: !debugs.wireframe,
                strokeWidth
              })
              break
            case "line":
              gfx.drawLine(
                shape.center1.x,
                shape.center1.y,
                shape.center2.x,
                shape.center2.y,
                {
                  strokeColor,
                  strokeWidth
                }
              )
              break
          }
        }
      }
    }

    // Draw joints
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

    // Draw debugs
    {
      const options = {
        strokeColor: debugColor,
        wireframe: true,
        strokeWidth
      }

      if (debugs.aabb) {
        for (let i = 0; i < world.bodies.length; ++i) {
          const body = world.bodies[i]

          for (const s of body.fixtures) {
            gfx.drawAABB(s.aabb, options)
          }

          if (body.fixtures.length > 1) {
            gfx.drawAABB(body.aabb, options)
          }
        }
      }

      if (debugs.bvh) {
        world.dynamicTree.traverse(node => {
          gfx.drawAABB(node.aabb, options)
        })
      }

      for (let i = 0; i < world.contactKeys.length; ++i) {
        const contact = world.contacts.get(world.contactKeys[i])
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
    }

    gfx.setCamera(null)
  }

  setup()

  function update() {
    const step = 1 / 60
    let last = performance.now()

    const loop = now => {
      const dt = (now - last) * 0.001
      last = now

      simulate(step)
      settings.status.fps = 1 / dt
      settings.status.bodies = world.bodies.length
      settings.status.contacts = world.contacts.size
      settings.status.joints = world.joints.size

      render(gfx)
      requestAnimationFrame(loop)
    }

    requestAnimationFrame(loop)
  }

  update()
})
