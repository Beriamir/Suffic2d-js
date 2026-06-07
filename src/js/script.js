import s2 from './s2/s2.module.js'
import Graphics from './Graphics.js'

document.addEventListener('DOMContentLoaded', _ => {
  const canvas = document.getElementById('canvas')
  const gfx = new Graphics(canvas)

  canvas.width = 800
  canvas.height = 600

  const world = new s2.World({
    gravity: new s2.Vector(0, 1000 * 0.981),
    substeps: 2,
    solverIterations: 4
  })

  const debug = false

  function setup() {
    world.clear()

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

    const restitution = 0.0
    const body0 = new s2.RigidBody(400, 50, 0, {
      restitution,
      friction: 0.6
    })
    const body1 = new s2.RigidBody(400, 200, 0, {
      restitution,
      friction: 0.6
    })
    const body2 = new s2.RigidBody(400, 300, 0, {
      restitution,
      friction: 0.6
    })

    let width = 100
    let height = 100
    const shape0 = new s2.Polygon(
      [-width, -height, width, -height, width, height, -width, height],
      { offset: new s2.Vector() }
    )

    width = 50
    height = 50
    const shape1 = new s2.Polygon(
      [-width, -height, width, -height, width, height, -width, height],
      { offset: new s2.Vector() }
    )

    width = 20
    height = 20
    const shape2 = new s2.Polygon(
      [-width, -height, width, -height, width, height, -width, height],
      { offset: new s2.Vector() }
    )

    body0.createFixture(shape0)
    body1.createFixture(shape1)
    body2.createFixture(shape2)
    world.createBody(body0)
    world.createBody(body1)
    world.createBody(body2)

    for (let i = 0; i < 100; i++) {
      const x = Math.random() * canvas.width
      const y = Math.random() * canvas.height
      const body = new s2.RigidBody(x, y, 0, {
        restitution: 0.3,
        friction: 0.6
      })

      const width = 10
      const height = 10
      const shape1 = new s2.Polygon(
        [-width, -height, width, -height, width, height, -width, height],
        { offset: new s2.Vector() }
      )

      body.createFixture(shape1)
      world.createBody(body)
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
      for (const s of body.fixtures) {
        gfx.drawPolygon(body.position.x, body.position.y, body.cos, body.sin, {
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
          manifold: {
            normal,
            overlap,
            polytope,
            contactPoints,
            refEdge,
            incEdge
          }
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
          vertices: refEdge,
          strokeColor: color
        })
        gfx.drawLine(0, 0, 1, 0, {
          vertices: incEdge,
          strokeColor: color
        })

        for (const cp of contactPoints) {
          const nImpulse = new Float32Array(4)

          nImpulse[0] = 0
          nImpulse[1] = 0
          nImpulse[2] = normal.x * cp.normalImpulse
          nImpulse[3] = normal.y * cp.normalImpulse

          gfx.drawNormal(cp.pointX, cp.pointY, normal.x, normal.y, {
            strokeColor: color
          })
          gfx.drawCircle(cp.pointX, cp.pointY, 1, 0, {
            radius: 5,
            strokeColor: color,
            wireframe: true
          })
          gfx.drawLine(cp.pointX, cp.pointY, 1, 0, {
            vertices: nImpulse,
            strokeColor: 'white'
          })
        }
      })
    }

    gfx.status(10, 10, [
      `fps: ${Math.ceil(1 / dt)}`,
      `steps: ${world.substeps}`,
      `solver iters: ${world.solverIterations}`,
      `bodies: ${world.bodies.length}`,
      `joints: ${0}`
    ])
  }

  function update() {
    let last = performance.now()
    let accu = 0
    const interval = 1 / 60

    const loop = now => {
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

    requestAnimationFrame(loop)
  }

  setup()
  update()
})
