import DynamicTree from "./DynamicTree.js"
import Vector from "./Vector.js"
import Vertices from "./Vertices.js"
import Collision from "./Collision.js"
import ContactSolver from "./ContactSolver.js"
import RigidBody from "./RigidBody.js"

export default class World {
  #bodies
  #contacts
  #contactKeys
  #contactsOld
  #contactSolver
  #dynamicTree
  #collision
  #nearby
  constructor(option = {}) {
    this.#bodies = []
    this.#contacts = new Map()
    this.#contactKeys = []
    this.#contactsOld = new Map()
    this.#contactSolver = new ContactSolver()
    this.#dynamicTree = new DynamicTree()
    this.#collision = new Collision()
    this.#nearby = []

    this.gravity = option.gravity ?? new Vector()
    this.substeps = option.substeps ?? 2
    this.iterations = option.iterations ?? 4
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
      this.destroyRigidBody(this.#bodies[i])
      --i
    }
  }

  createRigidBody(x, y, rot, option = {}) {
    const body = new RigidBody(x, y, rot, option)

    this.#dynamicTree.insertBody(body, 10)
    this.#bodies.push(body)
    body.index = this.#bodies.length - 1

    return body
  }

  destroyRigidBody(body) {
    const index = body.index
    const last = this.#bodies.length - 1

    if (index < 0 || index > last) return

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
      // Collision detection
      this.#contacts.clear()
      this.#contactKeys.length = 0

      for (let i = 0; i < this.#bodies.length; ++i) {
        const bodyA = this.#bodies[i]
        const idA = bodyA.id

        this.#nearby.length = 0
        this.#dynamicTree.queryAABB(bodyA.aabb, this.#nearby)

        for (let j = 0; j < this.#nearby.length; ++j) {
          const bodyB = this.#nearby[j]
          const idB = bodyB.id

          if (idA >= idB || !bodyA.aabb.overlaps(bodyB.aabb)) {
            continue
          }

          for (const sA of bodyA.fixtures) {
            sA.updateWorldVertices(
              bodyA.position.x,
              bodyA.position.y,
              bodyA.cos,
              bodyA.sin
            )
            sA.updateAABB()

            for (const sB of bodyB.fixtures) {
              sB.updateWorldVertices(
                bodyB.position.x,
                bodyB.position.y,
                bodyB.cos,
                bodyB.sin
              )
              sB.updateAABB()

              if (!sA.aabb.overlaps(sB.aabb)) {
                continue
              }

              // Narrowphase
              const manifold = this.#collision.detect(
                sA.worldVertices,
                sB.worldVertices,
                Vector.sub(bodyB.position, bodyA.position)
              )

              if (!manifold) {
                continue
              }

              const key = `${idA}-${sA.id},${idB}-${sB.id}`
              const newContact = {
                bodyA,
                bodyB,
                manifold
              }

              this.#contacts.set(key, newContact)
              this.#contactKeys.push(key)
            }
          }
        }
      }
      this.#contactKeys.sort((a, b) => {
        if (a < b) return -1
        if (a > b) return 1
        return 0
      })

      // Apply gravity
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

      // PGS Solve
      for (let i = 0; i < this.iterations; ++i) {
        for (let j = 0; j < this.#contactKeys.length; ++j) {
          const contact = this.#contacts.get(this.#contactKeys[j])

          this.#contactSolver.solve(contact, true)
        }
      }

      // Update position and broadphase
      for (let i = 0; i < this.#bodies.length; ++i) {
        const body = this.#bodies[i]

        if (body.isStatic) continue

        body.translate(body.linearVelocity, dt)
        body.rotate(body.angularVelocity * dt)
        body.updateAABB()

        this.#dynamicTree.updateBody(body, 10)
      }

      // Relax + store
      this.#contactsOld.clear()
      for (let i = 0; i < this.#contactKeys.length; ++i) {
        const key = this.#contactKeys[i]
        const contact = this.#contacts.get(key)

        this.#contactSolver.solve(contact, false)
        this.#contactsOld.set(key, contact)
      }
    }
  }
}
