import DynamicTree from './DynamicTree.js'
import Vector from './Vector.js'
import Vertices from './Vertices.js'
import Collision from './Collision.js'
import ContactSolver from './ContactSolver.js'

export default class World {
  constructor(options = {}) {
    this.bodies = []
    this.nearby = []
    this.dynamicTree = new DynamicTree()
    this.collision = new Collision()
    this.contactSolver = new ContactSolver()
    this.contactChecks = new Set()

    this.contactKeys = []
    this.newContacts = new Map()
    this.oldContacts = new Map()

    this.gravity = options.gravity ?? new Vector()
    this.substeps = options.substeps ?? 2
    this.iterations = options.iterations ?? 4
  }
  forEachBody(callback) {
    for (let i = 0; i < this.bodies.length; ++i) {
      const body = this.bodies[i]

      if (callback(body, i)) {
        break
      }
    }
  }
  forEachContact(callback) {
    for (const key of this.contactKeys) {
      callback(this.newContacts.get(key), key)
    }
  }
  traverseTree(callback) {
    this.dynamicTree.traverse(callback)
  }
  clear() {
    this.forEachBody(body => {
      this.dynamicTree.removeBody(body)
    })
    this.bodies.length = 0
  }
  createBody(body) {
    this.dynamicTree.insertBody(body, 5)
    this.bodies.push(body)
    body.index = this.bodies.length - 1
  }
  destroyBody(body) {
    this.dynamicTree.removeBody(body)
    const index = body.index
    const last = this.bodies.length - 1
    this.bodies[index] = this.bodies[last]
    this.bodies[index].index = index
    this.bodies.pop()
  }
  simulate(dt) {
    dt /= this.substeps

    const invH = 1 / dt

    for (let substep = 0; substep < this.substeps; ++substep) {
      this.contactChecks.clear()
      this.contactKeys.length = 0
      this.newContacts.clear()

      // Collision detection
      this.forEachBody(body => {
        body.contactKeys.clear()
      })
      this.forEachBody(bodyA => {
        const idA = bodyA.id

        this.nearby.length = 0
        this.dynamicTree.queryAABB(bodyA.aabb, this.nearby)

        for (const bodyB of this.nearby) {
          const idB = bodyB.id

          if (idA >= idB || !bodyA.aabb.overlaps(bodyB.aabb)) {
            continue
          }

          for (const sA of bodyA.fixtures) {
            const worldVerticesA = sA.getWorldVertices(
              bodyA.position.x,
              bodyA.position.y,
              bodyA.cos,
              bodyA.sin
            )

            Vertices.getAABB(worldVerticesA, sA.aabb)

            for (const sB of bodyB.fixtures) {
              const key =
                ((BigInt(idA) & 0xffffffn) << 56n) |
                ((BigInt(sA.id) & 0xffffn) << 40n) |
                ((BigInt(idB) & 0xffffffn) << 16n) |
                (BigInt(sB.id) & 0xffffn)

              if (this.contactChecks.has(key)) {
                continue
              } else {
                this.contactChecks.add(key)
              }

              const worldVerticesB = sB.getWorldVertices(
                bodyB.position.x,
                bodyB.position.y,
                bodyB.cos,
                bodyB.sin
              )

              Vertices.getAABB(worldVerticesB, sB.aabb)

              if (!sA.aabb.overlaps(sB.aabb)) {
                continue
              }

              const manifold = this.collision.detect(
                worldVerticesA,
                worldVerticesB
              )

              if (!manifold) {
                continue
              }

              const newContact = {
                bodyA,
                bodyB,
                manifold
              }

              bodyA.contactKeys.add(key)
              bodyB.contactKeys.add(key)
              this.contactKeys.push(key)
              this.newContacts.set(key, newContact)
            }
          }
        }
      })

      // todo Simulation Island?

      // Apply gravity
      this.forEachBody(body => {
        if (!body.isStatic) {
          body.linearVelocity.addMulV(this.gravity, dt)
        }
      })

      // Improves convergence
      this.contactKeys.sort((a, b) => {
        if (a < b) return -1
        if (a > b) return 1
        return 0
      })

      // Prepare and warm start contacts
      this.forEachContact((newContact, key) => {
        this.contactSolver.prepare(newContact)

        if (!this.oldContacts.has(key)) {
          return
        }

        const newManifold = newContact.manifold
        const newCount = newManifold.contactPoints.length

        const oldContact = this.oldContacts.get(key)
        const oldManifold = oldContact.manifold
        const oldCount = oldManifold.contactPoints.length

        for (let i = 0; i < newCount; ++i) {
          const newCp = newManifold.contactPoints[i]

          for (let j = 0; j < oldCount; j++) {
            const oldCp = oldManifold.contactPoints[j]

            if (newCp.id === oldCp.id) {
              newCp.normalImpulse = oldCp.normalImpulse
              newCp.tangentImpulse = oldCp.tangentImpulse
              newCp.persistent = true

              break
            }
          }
        }

        this.contactSolver.warmStart(newContact)
      })

      // Solve
      let useBias = true
      for (let i = 0; i < this.iterations; ++i) {
        this.forEachContact(contact => {
          this.contactSolver.solve(contact, invH, useBias)
        })
      }

      // Update bodies
      this.forEachBody(body => {
        if (body.isStatic) return

        body.translate(body.linearVelocity, dt)
        body.rotate(body.angularVelocity * dt)
        body.updateAABB()
        this.dynamicTree.updateBody(body, 5)
      })

      // Relax ans store contacts
      useBias = false
      this.oldContacts.clear()
      this.forEachContact((contact, key) => {
        this.contactSolver.solve(contact, invH, useBias)
        this.oldContacts.set(key, contact)
      })
    }
  }
}
