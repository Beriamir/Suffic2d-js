import DynamicTree from "./DynamicTree.js"
import Vector from "./Vector.js"
import Vertices from "./Vertices.js"
import ContactSolver from "./ContactSolver.js"
import RigidBody from "./RigidBody.js"
import Circle from "./Circle.js"
import Collider from "./Collider.js"

export default class World {
  #bodies
  #contacts
  #contactKeys
  #contactsOld
  #contactSolver
  #dynamicTree
  #nearby
  #collider
  constructor(option = {}) {
    this.#bodies = []
    this.#contacts = new Map()
    this.#contactKeys = []
    this.#contactsOld = new Map()
    this.#contactSolver = new ContactSolver(option)
    this.#dynamicTree = new DynamicTree()
    this.#nearby = []
    this.#collider = new Collider()

    this.gravity = option.gravity ?? new Vector()
    this.substeps = option.substeps ?? 2
    this.velocityIterations = option.velocityIterations ?? 4
    this.positionIterations = option.positionIterations ?? 2
    this.nodeMargin = option.nodeMargin ?? 10
  }

  get bodies() {
    return this.#bodies
  }
  get contacts() {
    return this.#contacts
  }
  get contactKeys() {
    return this.#contactKeys
  }
  get contactSolver() {
    return this.#contactSolver
  }
  get dynamicTree() {
    return this.#dynamicTree
  }

  clear() {
    for (let i = 0; i < this.#bodies.length; ++i) {
      this.destroyBody(this.#bodies[i])
      --i
    }
  }

  createBody(body) {
    if (body.index >= 0) {
      return body
    }

    this.#dynamicTree.insertBody(body, this.nodeMargin)
    this.#bodies.push(body)
    body.index = this.#bodies.length - 1

    return body
  }

  destroyBody(body) {
    const index = body.index
    const last = this.#bodies.length - 1

    if (index < 0 || index > last) {
      return body
    }

    this.#dynamicTree.removeBody(body)

    if (index != last) {
      this.#bodies[index] = this.#bodies[last]
      this.#bodies[index].index = index
    }

    this.#bodies.pop()
    body.index = -1

    return body.index
  }

  simulate(dt) {
    dt /= this.substeps

    for (let step = 0; step < this.substeps; ++step) {
      this.#contacts.clear()
      this.#contactKeys.length = 0

      // Collision detection
      for (let i = 0; i < this.#bodies.length; ++i) {
        const bodyA = this.#bodies[i]
        const idA = bodyA.id

        // Broadphase
        this.#nearby.length = 0
        this.#dynamicTree.queryAABB(bodyA.aabb, this.#nearby)

        for (let j = 0; j < this.#nearby.length; ++j) {
          const bodyB = this.#nearby[j]
          const idB = bodyB.id

          if (idA === idB || !bodyA.aabb.overlaps(bodyB.aabb)) {
            continue
          }

          for (const sA of bodyA.fixtures) {
            for (const sB of bodyB.fixtures) {
              const key =
                idA < idB
                  ? `${idA}-${sA.id},${idB}-${sB.id}`
                  : `${idB}-${sB.id},${idA}-${sA.id}`

              if (this.#contacts.has(key)) {
                continue
              }

              // Narrowphase
              const manifold = this.#collider.collide(sA, sB)

              if (!manifold) {
                continue
              }

              this.#contactKeys.push(key)
              this.#contacts.set(key, {
                bodyA,
                bodyB,
                manifold
              })
            }
          }
        }
      }
      this.#contactKeys.sort((a, b) => {
        if (a < b) return -1
        if (a > b) return 1
        return 0
      })

      // TODO: Simulation Island?

      for (let i = 0; i < this.#bodies.length; ++i) {
        const body = this.#bodies[i]

        if (!body.isStatic) {
          body.linearVelocity.addMulV(this.gravity, dt)
        }
      }

      // Prepare and warm start
      for (let i = 0; i < this.#contactKeys.length; ++i) {
        const key = this.#contactKeys[i]
        const newContact = this.#contacts.get(key)

        this.#contactSolver.prepare(newContact, dt)

        if (!this.#contactsOld.has(key)) {
          continue
        }

        const oldContact = this.#contactsOld.get(key)
        const newPts = newContact.manifold.contactPoints
        const oldPts = oldContact.manifold.contactPoints

        for (const newCp of newPts) {
          for (const oldCp of oldPts) {
            if (newCp.id == oldCp.id) {
              newCp.normalImpulse = oldCp.normalImpulse
              newCp.tangentImpulse = oldCp.tangentImpulse
              newCp.persistent = true
              break
            }
          }
        }

        this.#contactSolver.warmStart(newContact)
      }

      // Solve
      for (let i = 0; i < this.velocityIterations; ++i) {
        for (let j = 0; j < this.#contactKeys.length; ++j) {
          const contact = this.#contacts.get(this.#contactKeys[j])

          this.#contactSolver.solve(contact, true)
        }
      }

      // Update position and broadphase
      for (let i = 0; i < this.#bodies.length; ++i) {
        const body = this.#bodies[i]

        if (body.isStatic) continue

        body.position.addMulV(body.linearVelocity, dt)
        body.rotation += body.angularVelocity * dt

        for (let j = 0; j < body.fixtures.length; ++j) {
          const s = body.fixtures[j]

          s.updateWorldVertices(
            body.position.x,
            body.position.y,
            body.cos,
            body.sin
          )
        }

        body.updateAABB()
        this.#dynamicTree.updateBody(body, this.nodeMargin)
      }

      // Relax
      for (let i = 0; i < this.positionIterations; ++i) {
        for (let j = 0; j < this.#contactKeys.length; ++j) {
          const contact = this.#contacts.get(this.#contactKeys[j])

          this.#contactSolver.solve(contact, false)
        }
      }

      // Store
      this.#contactsOld.clear()
      for (let i = 0; i < this.#contactKeys.length; ++i) {
        const key = this.#contactKeys[i]
        const contact = this.#contacts.get(key)

        this.#contactsOld.set(key, contact)
      }
    }
  }
}
