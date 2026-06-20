import DynamicTree from "./DynamicTree.js"
import Vector from "./Vector.js"
import Vertices from "./Vertices.js"
import Collision from "./Collision.js"
import ContactSolver from "./ContactSolver.js"
import BlockSolver from "./BlockSolver.js"
import RigidBody from "./RigidBody.js"

export default class World {
  #_bodies
  #_contactKeys
  #_newContacts
  #_oldContacts
  #_contactSolver
  #_blockSolver
  #_dynamicTree
  #_collision
  #_nearby
  constructor(option = {}) {
    this.#_bodies = []
    this.#_contactKeys = []
    this.#_newContacts = new Map()
    this.#_oldContacts = new Map()
    this.#_contactSolver = new ContactSolver()
    this.#_blockSolver = new BlockSolver()
    this.#_dynamicTree = new DynamicTree()
    this.#_collision = new Collision()
    this.#_nearby = []

    this.gravity = option.gravity ?? new Vector()
    this.substeps = option.substeps ?? 2
    this.iterations = option.iterations ?? 4
    this.useBlockSolver = option.useBlockSolver ?? false
  }
  get bodies() {
    return this.#_bodies
  }
  forEachBody(callback) {
    for (let i = 0; i < this.#_bodies.length; ++i) {
      callback(this.#_bodies[i], i)
    }
  }
  forEachContact(callback) {
    for (let i = 0; i < this.#_contactKeys.length; ++i) {
      const key = this.#_contactKeys[i]

      callback(this.#_newContacts.get(key), key)
    }
  }
  traverseTree(callback) {
    this.#_dynamicTree.traverse(callback)
  }
  clear() {
    for (let i = 0; i < this.#_bodies.length; ++i) {
      this.destroyRigidBody(this.#_bodies[i])
      --i
    }
  }
  createRigidBody(x, y, rot, option = {}) {
    const body = new RigidBody(x, y, rot, option)

    this.#_dynamicTree.insertBody(body, 10)
    this.#_bodies.push(body)
    body.index = this.#_bodies.length - 1

    return body
  }
  destroyRigidBody(body) {
    const index = body.index
    const last = this.#_bodies.length - 1

    if (index < 0 || index > last) return

    this.#_dynamicTree.removeBody(body)

    if (index != last) {
      this.#_bodies[index] = this.#_bodies[last]
      this.#_bodies[index].index = index
    }

    this.#_bodies.pop()
    body.index = -1

    return body.index
  }
  simulate(dt) {
    dt /= this.substeps

    for (let step = 0; step < this.substeps; ++step) {
      // Collision detection
      this.#_contactKeys.length = 0
      this.#_newContacts.clear()
      this.forEachBody(bodyA => {
        this.#_nearby.length = 0
        this.#_dynamicTree.queryAABB(bodyA.aabb, this.#_nearby)

        for (const bodyB of this.#_nearby) {
          const idA = bodyA.id
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

              const manifold = this.#_collision.detect(
                worldVerticesA,
                worldVerticesB,
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

              this.#_contactKeys.push(key)
              this.#_newContacts.set(key, newContact)
            }
          }
        }
      })
      this.#_contactKeys.sort((a, b) => {
        if (a < b) return -1
        if (a > b) return 1
        return 0
      })

      // Apply gravity
      this.forEachBody(body => {
        if (!body.isStatic) {
          body.linearVelocity.addMulV(this.gravity, dt)
        }
      })

      this.forEachContact((newContact, key) => {
        if (this.useBlockSolver) {
          this.#_blockSolver.prepare(newContact, dt)
        } else {
          this.#_contactSolver.prepare(newContact, dt)
        }

        if (!this.#_oldContacts.has(key)) {
          return
        }

        const oldContact = this.#_oldContacts.get(key)
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

        this.#_contactSolver.warmStart(newContact)
      })

      for (let i = 0; i < this.iterations; ++i) {
        this.forEachContact(contact => {
          if (this.useBlockSolver) {
            this.#_blockSolver.solve(contact, true)
          } else {
            this.#_contactSolver.solve(contact, true)
          }
        })
      }

      this.forEachBody(body => {
        if (body.isStatic) return

        body.translate(body.linearVelocity, dt)
        body.rotate(body.angularVelocity * dt)
        body.updateAABB()

        this.#_dynamicTree.updateBody(body, 10)
      })

      // Relax + store
      this.#_oldContacts.clear()
      this.forEachContact((contact, key) => {
        if (this.useBlockSolver) {
          this.#_blockSolver.solve(contact, false)
        } else {
          this.#_contactSolver.solve(contact, false)
        }
        this.#_oldContacts.set(key, contact)
      })
    }
  }
}
