import s2 from './s2/s2.module.js'
import Graphics from './Graphics.js'

document.addEventListener('DOMContentLoaded', _ => {
  const canvas = document.getElementById('canvas')
  const gfx = new Graphics(canvas)

  canvas.width = 800
  canvas.height = 800

  const world = new s2.World({
    gravity: new s2.Vector(0, 1000 * 0.981),
    substeps: 2,
    solverIterations: 4
  })

  const debug = false

  function setup() {
    const ground = new s2.RigidBody(canvas.width / 2, canvas.height - 50, 0, {
      isStatic: true
    }).createFixture(
      new s2.Polygon(
        new Float32Array([
          -(canvas.width * 0.45),
          -25,
          canvas.width * 0.45,
          -25,
          canvas.width * 0.45,
          25,
          -(canvas.width * 0.45),
          25
        ]),
        {
          fillColor: 'gray',
          strokeColor: 'dimgray'
        }
      )
    )

    world.createBody(ground)

    const size = 30
    const rows = 20
    const width = size / 2
    const height = size / 2

    for (let y = 0; y < rows; ++y) {
      for (let x = 0; x < rows - y; ++x) {
        world.createBody(
          new s2.RigidBody(
            canvas.width * 0.525 + x * size - (rows - y) * size * 0.5,
            canvas.height - 90 - y * size,
            0,
            {
              restitution: 0.3,
              friction: 0.6
            }
          ).createFixture(
            new s2.Polygon(
              [-width, -height, width, -height, width, height, -width, height],
              { offset: new s2.Vector() }
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

    if (debug) {
      world.traverseTree(node => {
        gfx.drawAABB(node.aabb, {
          strokeColor: 'dimgray',
          wireframe: true
        })
      })

      world.forEachContact(contact => {
        const {
          bodyA,
          bodyB,
          manifold: { normal, overlap, polytope, contactPoints, ref, inc }
        } = contact

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

        const originX = canvas.width * 0.5
        const originY = canvas.height * 0.5
        const mtv = new Float32Array(4)

        mtv[0] = 0
        mtv[1] = 0
        mtv[2] = normal.x * overlap
        mtv[3] = normal.y * overlap

        gfx.drawPolygon(originX, originY, 1, 0, {
          vertices: polytope,
          wireframe: true,
          strokeColor: 'dimgray'
        })
        gfx.drawLine(originX, originY, 1, 0, {
          vertices: mtv,
          strokeColor: 'red'
        })
        gfx.drawCircle(originX, originY, 1, 0, {
          radius: 1,
          fillColor: 'white',
          strokeColor: 'white'
        })

        const color = 'red'

        gfx.drawLine(0, 0, 1, 0, {
          vertices: ref.edge,
          strokeColor: color
        })
        gfx.drawLine(0, 0, 1, 0, {
          vertices: inc.edge,
          strokeColor: color
        })

        for (const cp of contactPoints) {
          const nImpulse = new Float32Array(4)

          nImpulse[0] = 0
          nImpulse[1] = 0
          nImpulse[2] = normal.x * cp.normalImpulse * dt
          nImpulse[3] = normal.y * cp.normalImpulse * dt

          gfx.drawLine(cp.pointX, cp.pointY, 1, 0, {
            vertices: nImpulse,
            strokeColor: 'white'
          })
          gfx.drawCircle(cp.pointX, cp.pointY, 1, 0, {
            radius: 5,
            strokeColor: color,
            wireframe: true
          })
          gfx.drawNormal(cp.pointX, cp.pointY, normal.x, normal.y, {
            strokeColor: color
          })
        }
      })
    }

    gfx.status(10, 10, [
      `fps: ${Math.ceil(1 / dt)}`,
      `sub steps: ${world.substeps}`,
      `solver iters: ${world.solverIterations}`,
      `bodies: ${world.bodies.length}`,
      `joints: ${0}`
    ])
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
      }

      requestAnimationFrame(loop)
    }

    loop()
  }

  setup()
  update()
})
