import s2 from "./s2/s2.module.js"
import Graphics from "./Graphics.js"
import dat from "./lib/dat.gui.mjs"
import scenes from "./scenes.js"

document.addEventListener("DOMContentLoaded", _ => {
  const canvas = document.getElementById("canvas")
  const guiEl = document.getElementById("gui")

  const gfx = new Graphics(canvas, {}).setSize(800, 800)
  const gui = new dat.GUI({
    autoPlace: false,
    hideable: true
  })
  const world = new s2.World({
    gravity: { x: 0, y: 1000 * 0.981 },
    substeps: 2,
    iterations: 4,
    enableBlock: false
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

  // 60 FPS recording
  const stream = canvas.captureStream(60)
  const recorder = new MediaRecorder(stream, {
    mimeType: "video/webm"
  })
  const chunks = []

  recorder.ondataavailable = e => {
    chunks.push(e.data)
  }

  recorder.onstop = () => {
    const blob = new Blob(chunks, {
      type: "video/webm"
    })

    const url = URL.createObjectURL(blob)

    const a = document.createElement("a")
    a.href = url
    a.download = "simulation.webm"
    a.click()
  }

  const recordings = {
    start() {
      recorder.start()
    },
    stop() {
      recorder.stop()
    }
  }
  const recordFol = gui.addFolder("Recordings")

  recordFol.add(recordings, "start")
  recordFol.add(recordings, "stop")

  const switchScenes = {
    pyramid() {
      world.clear()
      scenes.spawnGround(world, {
        x: canvas.width / 2,
        y: canvas.height,
        width: canvas.width / 2,
        height: 50
      })
      scenes.pyramid(world, {
        rows: 15,
        boxWidth: 40,
        boxHeight: 40,
        spacing: 0,
        centerX: canvas.width / 2,
        bottomY: canvas.height - 50,
        restitution: 0.0,
        friction: 0.3
      })
    },
    boxStack() {
      world.clear()
      scenes.spawnGround(world, {
        x: canvas.width / 2,
        y: canvas.height,
        width: canvas.width / 2,
        height: 50
      })
      scenes.boxStack(world, {
        columns: 1,
        rows: 12,
        boxWidth: 50,
        boxHeight: 50,
        spacing: 10,
        centerX: canvas.width / 2,
        bottomY: canvas.height - 50,
        restitution: 0.0,
        friction: 0.3
      })
    },
    jenga() {
      world.clear()
      scenes.spawnGround(world, {
        x: canvas.width / 2,
        y: canvas.height,
        width: canvas.width / 2,
        height: 50
      })
      scenes.jenga(world, {
        levels: 13,
        width: 80,
        height: 20,
        centerX: canvas.width / 2,
        bottomY: canvas.height - 50,
        restitution: 0.0,
        friction: 0.5
      })
    },
    highMass() {
      world.clear()
      scenes.spawnGround(world, {
        x: canvas.width / 2,
        y: canvas.height,
        width: canvas.width / 2,
        height: 50
      })
      scenes.highMass(world, {
        smallX: canvas.width / 2,
        smallY: canvas.height - 80,
        smallWidth: 20,
        smallHeight: 20,
        bigX: canvas.width / 2,
        bigY: canvas.height - 230,
        bigWidth: 100,
        bigHeight: 100,
        friction: 0.2
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

  statsFol.open()
  debugsFol.open()
  perimetersFol.open()

  gui.add(switchScenes, "pyramid")
  gui.add(switchScenes, "boxStack").name("box stacks")
  gui.add(switchScenes, "jenga")
  gui.add(switchScenes, "highMass").name("high mass")

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
        gfx.drawPolygon(position.x, position.y, cos, sin, {
          offsetX: s.offset.x,
          offsetY: s.offset.y,
          vertices: s.vertices,
          fillColor: body.isSleeping ? "gray" : s.fillColor,
          strokeColor: body.isSleeping ? "dimgray" : s.strokeColor,
          wireframe: debugs.wireframe,
          noStroke: !debugs.wireframe
        })
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
        manifold: { normal, overlap, polytope, contactPoints, ref, inc }
      } = contact

      const originX = canvas.width * 0.5
      const originY = canvas.height * 0.5
      const mtv = new Float32Array(4)

      mtv[0] = 0
      mtv[1] = 0
      mtv[2] = normal.x * overlap
      mtv[3] = normal.y * overlap

      if (debugs.epa) {
        gfx.drawPolygon(originX, originY, 1, 0, {
          vertices: polytope,
          wireframe: true,
          strokeColor: debugColor
        })
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

      if (debugs.ref) {
        gfx.drawLine(0, 0, 1, 0, {
          vertices: ref.edge,
          strokeColor: debugColor
        })
      }

      if (debugs.inc) {
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
