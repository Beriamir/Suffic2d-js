import s2 from './s2/s2.module.js'
import Graphics from './Graphics.js'
import Decomposer from './Decomposer.js'
import dat from './lib/dat.gui.mjs'

document.addEventListener('DOMContentLoaded', _ => {
  const canvas = document.getElementById('canvas')
  const guiEl = document.getElementById('gui')

  const decomposer = new Decomposer()
  const gfx = new Graphics(canvas, {}).setSize(800, 800)
  const gui = new dat.GUI({
    autoPlace: false,
    hideable: true
  })
  const world = new s2.World({
    gravity: { x: 0, y: 1000 * 0.981 },
    substeps: 2,
    iterations: 4
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

  const statsFol = gui.addFolder('Stats')
  for (const stat of Object.keys(stats)) {
    statsFol.add(stats, stat).listen().name(stat.toUpperCase())
  }

  const debugsFol = gui.addFolder('Debugs')
  for (const key of Object.keys(debugs)) {
    debugsFol.add(debugs, key).name(key.toUpperCase())
  }

  const perimetersFol = gui.addFolder('Perimeters')
  perimetersFol.add(world, 'substeps', 1, 10, 1).name('SUB STEPS')
  perimetersFol.add(world, 'iterations', 1, 10, 1).name('ITERATIONS')

  statsFol.open()
  debugsFol.open()
  perimetersFol.open()

  gui.add(
    {
      restart() {
        setup()
      }
    },
    'restart'
  )

  guiEl.appendChild(gui.domElement)

  // canvas.addEventListener('pointerdown', event => {
  //   const { clientX, clientY } = event

  //   const size = 20

  //   const body = new s2.RigidBody(clientX, clientY, 0, {
  //     restitution: 0.0
  //   }).createFixture(
  //     new s2.Polygon(
  //       new Float32Array([-size, -size, size, -size, size, size, -size, size])
  //     )
  //   )

  //   world.createBody(body)
  // })

  function createPyramid(world, options = {}) {
    const {
      rows = 15,
      boxSize = 40,
      spacing = 0,
      centerX = canvas.width / 2,
      bottomY = canvas.height,
      restitution = 0.0,
      friction = 0.3
    } = options

    const halfSize = boxSize / 2
    const step = boxSize + spacing

    for (let row = 0; row < rows; ++row) {
      const count = rows - row
      const rowY = bottomY - halfSize - row * step
      const rowStartX = centerX - (count * step) / 2 + step / 2

      for (let col = 0; col < count; ++col) {
        const x = rowStartX + col * step
        const y = rowY

        world.createBody(
          new s2.RigidBody(x, y, 0, { restitution, friction }).createFixture(
            new s2.Polygon(
              new Float32Array([
                -halfSize,
                -halfSize,
                halfSize,
                -halfSize,
                halfSize,
                halfSize,
                -halfSize,
                halfSize
              ])
            )
          )
        )
      }
    }
  }

  function createStack(world, options = {}) {
    const {
      columns = 1,
      rows = 20,
      boxSize = 40,
      spacing = 0,
      centerX = canvas.width / 2,
      bottomY = canvas.height,
      restitution = 0.0,
      friction = 0.3
    } = options

    const halfSize = boxSize / 2
    const step = boxSize + spacing
    const startX = centerX - ((columns - 1) * step) / 2

    for (let col = 0; col < columns; ++col) {
      const x = startX + col * step

      for (let row = 0; row < rows; ++row) {
        const y = bottomY - halfSize - row * step

        world.createBody(
          new s2.RigidBody(x, y, 0, {
            restitution,
            friction
          }).createFixture(
            new s2.Polygon(
              new Float32Array([
                -halfSize,
                -halfSize,
                halfSize,
                -halfSize,
                halfSize,
                halfSize,
                -halfSize,
                halfSize
              ])
            )
          )
        )
      }
    }
  }

  function setup() {
    world.clear()

    const ground = new s2.RigidBody(canvas.width / 2, canvas.height, 0, {
      isStatic: true,
      restitution: 1,
      friction: 1
    })
    const width = canvas.width / 2
    const height = 50

    ground.createFixture(
      new s2.Polygon(
        new Float32Array([
          -width,
          -height,
          width,
          -height,
          width,
          height,
          -width,
          height
        ]),
        {
          fillColor: 'gray',
          strokeColor: 'dimgray'
        }
      )
    )

    world.createBody(ground)
    createPyramid(world, {
      rows: 15,
      boxSize: 40,
      spacing: 4,
      bottomY: canvas.height - height,
      restitution: 0.0,
      friction: 0.3
    })
    createStack(world, {
      columns: 0,
      rows: 20,
      boxSize: 40,
      spacing: 4,
      centerX: canvas.width / 2,
      bottomY: canvas.height - height,
      restitution: 0.0,
      friction: 0.3
    })

    /*
    const polygons = []
    for (let i = 0; i < 10; i++) {
      polygons.push(decomposer.createConcaveShape(12, 80))
    }

    for (const polygon of Object.values(polygons)) {
      const x = Math.random() * canvas.width
      const y = Math.random() * canvas.height * 0.5
      const body = new s2.RigidBody(x, y, 0, {
        restitution: 0.1,
        friction: 0.3
      })

      for (const piece of decomposer.decompose(polygon, [])) {
        body.createFixture(new s2.Polygon(piece, {}))
      }

      world.createBody(body)
    }
    */
  }

  function simulate(dt) {
    world.simulate(dt)
    world.forEachBody(body => {
      if (body.position.y > canvas.height * 2) {
        world.destroyBody(body)
      }
    })
  }

  function render(gfx, dt) {
    const debugColor = 'lightgray'

    gfx.clear(0, 0, canvas.width, canvas.height)
    world.forEachBody(body => {
      const { position, cos, sin } = body

      for (const s of body.fixtures) {
        gfx.drawPolygon(position.x, position.y, cos, sin, {
          offsetX: s.offset.x,
          offsetY: s.offset.y,
          vertices: s.vertices,
          fillColor: body.isSleeping ? 'gray' : s.fillColor,
          strokeColor: body.isSleeping ? 'dimgray' : s.strokeColor,
          wireframe: debugs.wireframe,
          noStroke: !debugs.wireframe
        })

        if (debugs.aabb) {
          gfx.drawAABB(body.aabb, {
            strokeColor: debugColor,
            wireframe: true
          })
        }
      }
    })

    if (debugs.bvh) {
      world.traverseTree(node => {
        gfx.drawAABB(node.aabb, {
          strokeColor: debugColor,
          wireframe: true
        })
      })
    }

    world.forEachContact((contact, key) => {
      const {
        bodyA,
        bodyB,
        manifold: { normal, overlap, polytope, contactPoints, ref, inc }
      } = contact

      if (debugs.aabb) {
        for (const s of bodyA.fixtures) {
          gfx.drawAABB(s.aabb, {
            strokeColor: debugColor,
            wireframe: true
          })
        }

        for (const s of bodyB.fixtures) {
          gfx.drawAABB(s.aabb, {
            strokeColor: debugColor,
            wireframe: true
          })
        }
      }

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
        gfx.drawCircle(originX, originY, 1, 0, {
          radius: 2,
          fillColor: debugColor,
          strokeColor: debugColor
        })
        gfx.drawLine(originX, originY, 1, 0, {
          vertices: mtv,
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
    })
  }

  function update() {
    let last = performance.now()
    let accu = 0
    const interval = 1 / 60

    const loop = () => {
      const now = performance.now()
      const dt = (now - last) * 0.001

      last = now
      accu += dt

      if (accu >= interval) {
        accu = 0
        simulate(interval)
        render(gfx, dt)

        stats.fps = 1 / dt
        stats.bodies = world.bodies.length
        stats.joints = 0
      }

      requestAnimationFrame(loop)
    }

    loop()
  }

  setup()
  update()
})
