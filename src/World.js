import DynamicTree from "./DynamicTree.js"
import Vector from "./Vector.js"
import Vertices from "./Vertices.js"
import RigidBody from "./RigidBody.js"
import Circle from "./Circle.js"
import Collider from "./Collider.js"
import Island from "./Island.js"

export default class World {
  #bodies = []
  #contacts = new Map()
  #contactKeys = []
  #oldContactPoints = new Map()
  #dynamicTree = new DynamicTree()
  #nearby = []
  #collider = new Collider()

  constructor(option = {}) {
    const gravity = option.gravity

    if (typeof gravity == "object") {
      this.gravity = gravity
    } else {
      this.gravity = new Vector(0, 9.81)
    }

    this.substeps = option.substeps ?? 1
    this.velocityIterations = option.velocityIterations ?? 10
    this.positionIterations = option.positionIterations ?? 2
    this.nodeMargin = option.nodeMargin ?? 0.1
    this.useBlockSolver = option.useBlockSolver ?? false
    this.island = new Island(this)
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
  get oldContactPoints() {
    return this.#oldContactPoints
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

    return body
  }

  simulate(dt) {
    dt /= this.substeps

    for (let step = 0; step < this.substeps; ++step) {
      this.#contacts.clear()
      this.#contactKeys.length = 0

      for (let i = 0; i < this.#bodies.length; ++i) {
        this.#bodies[i].contactKeys.length = 0
      }

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

          if (
            idA === idB ||
            !bodyA.aabb.overlaps(bodyB.aabb) ||
            (bodyA.isStatic && bodyB.isStatic)
          ) {
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
              const contact = this.#collider.collide(sA, sB)

              if (!contact) {
                continue
              }

              contact.bodyA = bodyA
              contact.bodyB = bodyB

              bodyA.contactKeys.push(key)
              bodyB.contactKeys.push(key)

              this.#contactKeys.push(key)
              this.#contacts.set(key, contact)
            }
          }
        }
      }

      for (let i = 0; i < this.#bodies.length; ++i) {
        const body = this.#bodies[i]

        if (this.island.visited.has(body.id) || body.isStatic) {
          continue
        }

        this.island.prepare()
        this.island.build(body)
        this.island.solve(dt)
      }

      this.island.visited.clear()

      // Cache
      this.#oldContactPoints.clear()
      for (let i = 0; i < this.#contactKeys.length; ++i) {
        const key = this.#contactKeys[i]
        const contact = this.#contacts.get(key)

        this.#oldContactPoints.set(key, contact.contactPoints)
      }
    }
  }
}
