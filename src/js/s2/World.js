import DynamicTree from './DynamicTree.js'
import Vector from './Vector.js'
import Vertices from './Vertices.js'
import Collision from './Collision.js'
import ContactSolver from './ContactSolver.js'

export default class World {
  constructor(options = {}) {
    this.bodies = []
    this.nearby = []
    this.contacts = [] // Sorted
    this.dynamicTree = new DynamicTree()
    this.collision = new Collision()
    this.contactSolver = new ContactSolver()
    this.contactChecks = new Set()
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
    for (const [key, manifold] of this.newContacts.entries()) {
      if (callback(manifold, key)) {
        break
      }
    }
  }

  forEachSortedContact(callback) {
    this.contacts.length = 0

    for (const entry of this.newContacts.keys()) {
      this.contacts.push(entry)
    }

    this.contacts.sort((a, b) => {
      if (a < b) return -1
      if (a > b) return 1
      return 0
    })

    for (const key of this.contacts) {
      const manifold = this.newContacts.get(key)

      if (callback(manifold, key)) {
        break
      }
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
    this.dynamicTree.insertBody(body)
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

  updateBody(body) {
    this.dynamicTree.updateBody(body)
  }

  simulate(dt) {
    dt /= this.substeps

    const invH = 1 / dt

    for (let substep = 0; substep < this.substeps; ++substep) {
      this.contactChecks.clear()
      this.newContacts.clear()

      this.forEachBody(bodyA => {
        let idA = bodyA.id

        this.nearby.length = 0
        this.dynamicTree.queryAABB(bodyA.aabb, this.nearby)

        for (const bodyB of this.nearby) {
          let idB = bodyB.id

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
              this.newContacts.set(key, newContact)
            }
          }
        }
      })

      // todo Simulation Island?

      this.forEachBody(body => {
        if (!body.isStatic) {
          body.linearVelocity.addMulV(this.gravity, dt)
        }
      })

      this.forEachContact((newContact, key) => {
        this.contactSolver.prepare(newContact)

        const oldContact = this.oldContacts.get(key)

        if (!oldContact) {
          return
        }

        const newManifold = newContact.manifold
        const oldManifold = oldContact.manifold

        const newCount = newManifold.contactPoints.length
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

      let useBias = true
      for (let i = 0; i < this.iterations; ++i) {
        this.forEachSortedContact(contact => {
          this.contactSolver.solve(contact, invH, useBias)
        })
      }

      this.forEachBody(body => {
        if (!body.isStatic) {
          body.transform(body.linearVelocity, body.angularVelocity, dt)
          this.updateBody(body)
        }
      })

      useBias = false
      this.forEachSortedContact(contact => {
        this.contactSolver.solve(contact, invH, useBias)
      })

      this.oldContacts.clear()
      this.forEachContact((newContact, key) => {
        this.oldContacts.set(key, newContact)
      })

      this.forEachBody(body => {
        body.contactKeys.clear()
      })
    }
  }
}
