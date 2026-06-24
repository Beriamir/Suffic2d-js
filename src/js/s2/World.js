import DynamicTree from "./DynamicTree.js"
import Vector from "./Vector.js"
import Vertices from "./Vertices.js"
import ContactSolver from "./ContactSolver.js"
import RigidBody from "./RigidBody.js"
import Circle from "./Circle.js"
import CollideCircleCircle from "./CollideCircleCircle.js"
import CollidePolygonCircle from "./CollidePolygonCircle.js"
import CollidePolygonPolygon from "./CollidePolygonPolygon.js"

export default class World {
  #bodies
  #contacts
  #contactKeys
  #contactsOld
  #contactSolver
  #dynamicTree
  #nearby

  #collideCircleCircle
  #collidePolygonCircle
  #collidePolygonPolygon
  constructor(option = {}) {
    this.#bodies = []
    this.#contacts = new Map()
    this.#contactKeys = []
    this.#contactsOld = new Map()
    this.#contactSolver = new ContactSolver(option)
    this.#dynamicTree = new DynamicTree()
    this.#nearby = []

    this.#collideCircleCircle = new CollideCircleCircle()
    this.#collidePolygonCircle = new CollidePolygonCircle()
    this.#collidePolygonPolygon = new CollidePolygonPolygon()

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

          if (idA >= idB || !bodyA.aabb.overlaps(bodyB.aabb)) {
            continue
          }

          for (const sA of bodyA.fixtures) {
            for (const sB of bodyB.fixtures) {
              // Narrowphase
              // TODO: Use a dispatcher?
              let manifold = null

              if (sA.type === "circle" && sB.type === "circle") {
                manifold = this.#collideCircleCircle.collide(
                  bodyA,
                  sA,
                  bodyB,
                  sB
                )
              } else if (sA.type === "circle" && sB.type === "polygon") {
                manifold = this.#collidePolygonCircle.collide(
                  bodyB,
                  sB,
                  bodyA,
                  sA
                )
              } else if (sA.type === "polygon" && sB.type === "circle") {
                manifold = this.#collidePolygonCircle.collide(
                  bodyA,
                  sA,
                  bodyB,
                  sB
                )
              } else if (sA.type === "polygon" && sB.type === "polygon") {
                manifold = this.#collidePolygonPolygon.collide(
                  bodyA,
                  sA,
                  bodyB,
                  sB
                )
              }

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
      for (let i = 0; i < this.iterations; ++i) {
        for (let j = 0; j < this.#contactKeys.length; ++j) {
          const contact = this.#contacts.get(this.#contactKeys[j])

          this.#contactSolver.solve(contact, true)
        }
      }

      // Update position and broadphase
      for (let i = 0; i < this.#bodies.length; ++i) {
        const body = this.#bodies[i]

        if (!body.isStatic) {
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
        }

        // TODO: Avoid inserting shapeless bodies into the tree?
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
