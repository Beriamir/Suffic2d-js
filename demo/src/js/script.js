import s2 from "../../../src/js/suffic2d.js"
import Graphics from "../../../lib/Graphics.js"
import dat from "../../../lib/dat.gui.mjs"
import scenes from "./scenes.js"

document.addEventListener("DOMContentLoaded", _ => {
  const canvas = document.getElementById("canvas")
  const guiEl = document.getElementById("gui")

  const gfx = new Graphics(canvas, {}).setSize(1600, 900)
  const gui = new dat.GUI({
    autoPlace: false,
    hideable: true
  })
  const world = new s2.World({
    gravity: { x: 0, y: 1000 },
    substeps: 2,
    iterations: 4,
    enableBlock: true
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

  const switchScenes = {
    pyramid() {
      world.clear()
      scenes.spawnGround(world, {
        x: canvas.width / 2,
        y: canvas.height - 50,
        width: canvas.width * 0.4,
        height: 25
      })
      scenes.pyramid(world, {
        rows: 15,
        boxWidth: 40,
        boxHeight: 40,
        spacing: 0,
        centerX: canvas.width / 2,
        bottomY: canvas.height - 75,
        restitution: 0.0,
        friction: 0.3
      })
    },
    boxStack() {
      world.clear()
      scenes.spawnGround(world, {
        x: canvas.width / 2,
        y: canvas.height - 50,
        width: canvas.width * 0.4,
        height: 25
      })
      scenes.boxStack(world, {
        columns: 4,
        rows: 12,
        boxWidth: 50,
        boxHeight: 50,
        spacing: 0,
        centerX: canvas.width / 2,
        bottomY: canvas.height - 75,
        restitution: 0.0,
        friction: 0.3
      })
    },
    circleStack() {
      world.clear()
      scenes.spawnGround(world, {
        x: canvas.width / 2,
        y: canvas.height - 50,
        width: canvas.width * 0.4,
        height: 25
      })
      scenes.circleStack(world, {
        columns: 4,
        rows: 12,
        radius: 25,
        spacing: 0,
        centerX: canvas.width / 2,
        bottomY: canvas.height - 75,
        restitution: 0.0,
        friction: 0.3
      })
    },
    jenga() {
      world.clear()
      scenes.spawnGround(world, {
        x: canvas.width / 2,
        y: canvas.height - 50,
        width: canvas.width * 0.4,
        height: 25
      })
      scenes.jenga(world, {
        levels: 13,
        width: 80,
        height: 20,
        gap: 0.0,
        centerX: canvas.width / 2,
        bottomY: canvas.height - 75,
        restitution: 0.0,
        friction: 0.5
      })
    },
    restitution() {
      world.clear()
      scenes.spawnGround(world, {
        x: canvas.width / 2,
        y: canvas.height - 50,
        width: canvas.width * 0.4,
        height: 25
      })
      scenes.restitution(world, {
        startX: canvas.width * 0.2,
        startY: canvas.height / 2 - 25,
        spacing: 120
      })
    },
    friction() {
      world.clear()
      scenes.spawnGround(world, {
        x: canvas.width / 2,
        y: canvas.height - 50,
        width: canvas.width * 0.4,
        height: 25
      })
      scenes.friction(world, {
        startX: canvas.width * 0.1,
        startY: canvas.height / 2 - 25,
        spacing: 60,
        rampWidth: canvas.width * 0.25,
        rampHeight: 10
      })
    }
  }

  const statsFol = gui.addFolder("Stats")
  for (const stat of Object.keys(stats)) {
    statsFol.add(stats, stat).listen().name(stat.toUpperCase())
  }

  const debugsFol = gui.addFolder("Debugs")
  for (const key of Object.keys(debugs)) {
    debugsFol.add(debugs, key).name(key.toUpperCase())
  }

  const perimetersFol = gui.addFolder("Perimeters")
  perimetersFol.add(world, "substeps", 1, 10, 1).name("SUB STEPS")
  perimetersFol.add(world, "iterations", 1, 10, 1).name("Iterations")

  // statsFol.open()
  // debugsFol.open()
  // perimetersFol.open()

  gui.add(switchScenes, "pyramid")
  gui.add(switchScenes, "boxStack").name("box stacks")
  gui.add(switchScenes, "circleStack").name("circle stacks")
  gui.add(switchScenes, "jenga")
  gui.add(switchScenes, "restitution").name("restitution")
  gui.add(switchScenes, "friction").name("friction")

  guiEl.appendChild(gui.domElement)

  function setup() {
    switchScenes.pyramid()
  }

  function simulate(dt) {
    world.simulate(dt)
    for (let i = 0; i < world.bodies.length; ++i) {
      const body = world.bodies[i]

      if (body.position.y > canvas.height * 2) {
        world.destroyRigidBody(body)
      }
    }
  }

  function render(gfx, dt) {
    const debugColor = "lightgray"

    gfx.clear(0, 0, canvas.width, canvas.height)
    for (let i = 0; i < world.bodies.length; ++i) {
      const body = world.bodies[i]
      const { position, cos, sin } = body

      for (const s of body.fixtures) {
        switch (s.type) {
          case "polygon":
            gfx.drawPolygon(position.x, position.y, cos, sin, {
              offsetX: s.offset.x,
              offsetY: s.offset.y,
              vertices: s.vertices,
              fillColor: body.isSleeping ? "gray" : s.fillColor,
              strokeColor: body.isSleeping ? "dimgray" : s.strokeColor,
              wireframe: debugs.wireframe,
              noStroke: !debugs.wireframe
            })
            break

          case "circle":
            gfx.drawCircle(position.x, position.y, cos, sin, {
              offsetX: s.offset.x,
              offsetY: s.offset.y,
              radius: s.radius,
              fillColor: body.isSleeping ? "gray" : s.fillColor,
              strokeColor: body.isSleeping ? "dimgray" : s.strokeColor,
              wireframe: debugs.wireframe,
              noStroke: !debugs.wireframe
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
          wireframe: true
        })
      }
    }

    if (debugs.bvh) {
      world.dynamicTree.traverse(node => {
        gfx.drawAABB(node.aabb, {
          strokeColor: debugColor,
          wireframe: true
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
          normal,
          overlap,
          polytope,
          dirX,
          dirY,
          radius,
          contactPoints,
          ref,
          inc
        }
      } = contact

      const originX = canvas.width * 0.5
      const originY = canvas.height * 0.5
      const mtv = new Float32Array(4)

      mtv[0] = 0
      mtv[1] = 0
      mtv[2] = normal.x * overlap
      mtv[3] = normal.y * overlap

      if (debugs.epa) {
        if (polytope) {
          gfx.drawPolygon(originX, originY, 1, 0, {
            vertices: polytope,
            wireframe: true,
            strokeColor: debugColor
          })
        } else {
          gfx.drawCircle(originX + dirX, originY + dirY, 1, 0, {
            radius: radius,
            wireframe: true,
            noLine: true,
            strokeColor: debugColor
          })
        }
        gfx.drawLine(originX, originY, 1, 0, {
          vertices: mtv,
          strokeColor: debugColor
        })
        gfx.drawCircle(originX, originY, 1, 0, {
          radius: 2,
          fillColor: debugColor,
          strokeColor: debugColor
        })
      }

      if (debugs.ref && ref) {
        gfx.drawLine(0, 0, 1, 0, {
          vertices: ref.edge,
          strokeColor: debugColor
        })
      }

      if (debugs.inc && inc) {
        gfx.drawLine(0, 0, 1, 0, {
          vertices: inc.edge,
          strokeColor: debugColor
        })
      }

      for (const cp of contactPoints) {
        const nImpulse = new Float32Array(4)

        nImpulse[0] = 0
        nImpulse[1] = 0
        nImpulse[2] = normal.x * cp.normalImpulse * dt
        nImpulse[3] = normal.y * cp.normalImpulse * dt

        if (debugs.impulse) {
          gfx.drawLine(cp.pointX, cp.pointY, 1, 0, {
            vertices: nImpulse,
            strokeColor: debugColor
          })
        }

        if (debugs.point) {
          gfx.drawCircle(cp.pointX, cp.pointY, 1, 0, {
            radius: 2,
            fillColor: debugColor,
            noStroke: true
          })
        }

        if (debugs.normal) {
          gfx.drawNormal(cp.pointX, cp.pointY, normal.x, normal.y, {
            length: 10,
            strokeColor: debugColor
          })
        }
      }
    }
  }

  function update() {
    let last = performance.now()
    let accu = 0
    const step = 1 / 60

    const loop = () => {
      const now = performance.now()
      const dt = (now - last) * 0.001

      last = now
      accu += dt

      if (accu >= step) {
        accu = 0
        simulate(step)
        render(gfx, step)
      }

      stats.fps = 1 / dt
      stats.bodies = world.bodies.length
      stats.joints = 0

      requestAnimationFrame(loop)
    }

    loop()
  }

  setup()
  update()
})
