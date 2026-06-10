import s2 from './s2/s2.module.js'
import Graphics from './Graphics.js'
import dat from './lib/dat.gui.mjs'

document.addEventListener('DOMContentLoaded', _ => {
  const canvas = document.getElementById('canvas')
  const guiEl = document.getElementById('gui')

  const gfx = new Graphics(canvas)
  const gui = new dat.GUI({
    autoPlace: false,
    hideable: true
  })

  const world = new s2.World({
    gravity: new s2.Vector(0, 1000 * 0.981),
    substeps: 2,
    iterations: 4
  })

  const debugs = {
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
  const debugsFol = gui.addFolder('Debugs')
  const perimetersFol = gui.addFolder('Perimeters')

  for (const stat of Object.keys(stats)) {
    statsFol.add(stats, stat).listen().name(stat.toUpperCase())
  }
  statsFol.open()

  for (const key of Object.keys(debugs)) {
    debugsFol.add(debugs, key).name(key.toUpperCase())
  }
  debugsFol.open()

  perimetersFol.add(world, 'substeps', 1, 10, 1).name('SUB STEPS')
  perimetersFol.add(world, 'iterations', 1, 10, 1).name('ITERATIONS')
  perimetersFol.open()

  canvas.width = 800
  canvas.height = 800
  guiEl.appendChild(gui.domElement)

  function setup() {
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

    const size = 30
    const rows = 10

    for (let y = 0; y < rows; ++y) {
      for (let x = 0; x < rows - y; ++x) {
        const width = size / 2
        const height = size / 2

        world.createBody(
          new s2.RigidBody(
            canvas.width / 2 + x * size - (rows - y) * size * 0.5,
            canvas.height - 65 - y * size,
            0,
            {
              restitution: 0.1,
              friction: 0.3
            }
          ).createFixture(
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
              {}
            )
          )
        )
      }
    }
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
    gfx.clear(0, 0, canvas.width, canvas.height)

    world.forEachBody(body => {
      const { position, cos, sin } = body

      for (const s of body.fixtures) {
        gfx.drawPolygon(position.x, position.y, cos, sin, {
          offsetX: s.offset.x,
          offsetY: s.offset.y,
          vertices: s.vertices,
          fillColor: s.fillColor,
          strokeColor: s.strokeColor,
          wireframe: false
        })
      }
    })

    if (debugs.bvh) {
      world.traverseTree(node => {
        gfx.drawAABB(node.aabb, {
          strokeColor: 'dimgray',
          wireframe: true
        })
      })
    }

    world.forEachContact(contact => {
      const {
        bodyA,
        bodyB,
        manifold: { normal, overlap, polytope, contactPoints, ref, inc }
      } = contact

      if (debugs.aabb) {
        for (const s of bodyA.fixtures) {
          gfx.drawAABB(s.aabb, {
            strokeColor: 'dimgray',
            wireframe: true
          })
        }

        for (const s of bodyB.fixtures) {
          gfx.drawAABB(s.aabb, {
            strokeColor: 'dimgray',
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
          strokeColor: 'dimgray'
        })
        gfx.drawCircle(originX, originY, 1, 0, {
          radius: 1,
          fillColor: 'white',
          strokeColor: 'white'
        })
        gfx.drawLine(originX, originY, 1, 0, {
          vertices: mtv,
          strokeColor: 'red'
        })
      }

      const color = 'red'

      if (debugs.ref) {
        gfx.drawLine(0, 0, 1, 0, {
          vertices: ref.edge,
          strokeColor: color
        })
      }

      if (debugs.inc) {
        gfx.drawLine(0, 0, 1, 0, {
          vertices: inc.edge,
          strokeColor: color
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
            strokeColor: 'white'
          })
        }

        if (debugs.point) {
          gfx.drawCircle(cp.pointX, cp.pointY, 1, 0, {
            radius: 5,
            strokeColor: color,
            wireframe: true
          })
        }

        if (debugs.normal) {
          gfx.drawNormal(cp.pointX, cp.pointY, normal.x, normal.y, {
            strokeColor: color
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
        stats.fps = 1 / dt
        stats.bodies = world.bodies.length
        stats.joints = 0

        simulate(interval)
        render(gfx, dt)
      }

      requestAnimationFrame(loop)
    }

    loop()
  }

  setup()
  update()
})
