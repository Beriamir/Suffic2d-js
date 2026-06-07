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
    this.newContacts = new Map()
    this.oldContacts = new Map()

    this.gravity = options.gravity ?? new Vector()
    this.substeps = options.substeps ?? 2
    this.solverIterations = options.solverIterations ?? 4
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

    for (let i = 0; i < this.substeps; i++) {
      this.contactChecks.clear()
      this.newContacts.clear()

      this.forEachBody(bodyA => {
        const idA = bodyA.id

        bodyA.contactKeys.clear()
        this.nearby.length = 0
        this.dynamicTree.queryAABB(bodyA.aabb, this.nearby)

        for (const bodyB of this.nearby) {
          const idB = bodyB.id

          if (
            (idA === idB && bodyA.type === bodyB.type) ||
            !bodyA.aabb.overlaps(bodyB.aabb)
          ) {
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
                idA < idB
                  ? `${idA}-${sA.id},${idB}-${sB.id}`
                  : `${idB}-${sB.id},${idA}-${sA.id}`

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

        for (let i = 0; i < newManifold.contactCount; i++) {
          const newCp = newManifold.contactPoints[i]

          for (let j = 0; j < oldManifold.contactCount; j++) {
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

      for (let i = 0; i < this.solverIterations; i++) {
        this.forEachContact(contact => {
          this.contactSolver.solve(contact, dt)
        })
      }

      this.oldContacts.clear()
      this.forEachContact((newContact, key) => {
        this.oldContacts.set(key, newContact)
      })

      this.forEachBody(body => {
        if (!body.isStatic) {
          body.transform(body.linearVelocity, body.angularVelocity, dt)
          this.updateBody(body)
        }
      })
    }
  }
}
