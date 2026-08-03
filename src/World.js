import DynamicTree from "./DynamicTree.js"
import Vector from "./Vector.js"
import Vertices from "./Vertices.js"
import RigidBody from "./RigidBody.js"
import Circle from "./Circle.js"
import Collider from "./Collider.js"
import Island from "./Island.js"

export default class World {
  #bodies = []
  #joints = new Map()
  #contacts = new Map()
  #contactKeys = []
  #jointKeys = []
  #oldContactPoints = new Map()
  #dynamicTree = new DynamicTree()
  #nearby = []
  #collider = new Collider()

  constructor(options = {}) {
    const gravity = options.gravity

    if (typeof gravity == "object") {
      this.gravity = gravity
    } else {
      this.gravity = new Vector(0, 9.81)
    }

    this.substeps = options.substeps ?? 1
    this.primaryIterations = options.primaryIterations ?? 8
    this.secondaryIterations = options.secondaryIterations ?? 3
    this.nodeMargin = options.nodeMargin ?? 0.1
    this.useBlockSolver = options.useBlockSolver ?? false
    this.useSleeping = options.useSleeping ?? false
    this.island = new Island(this)
  }

  get bodies() {
    return this.#bodies
  }
  get contacts() {
    return this.#contacts
  }
  get joints() {
    return this.#joints
  }
  get contactKeys() {
    return this.#contactKeys
  }
  get jointKeys() {
    return this.#jointKeys
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
    this.#oldContactPoints.clear()
    this.#contacts.clear()
    this.#contactKeys.length = 0

    this.#joints.clear()
    this.#jointKeys.length = 0
  }

  createJoint(joint) {
    if (!joint) {
      return joint
    }

    if (joint.type === "GrabJoint") {
      const key = `${joint.body.id}-grab`

      joint.body.jointKeys.push(key)

      this.#joints.set(key, joint)
      this.#jointKeys.push(key)
      this.createBody(joint.body)
    } else {
      const key = `${joint.bodyA.id}-${joint.bodyB.id}`

      joint.bodyA.jointKeys.push(key)
      joint.bodyB.jointKeys.push(key)

      this.#joints.set(key, joint)
      this.#jointKeys.push(key)
      this.createBody(joint.bodyA)
      this.createBody(joint.bodyB)
    }

    return joint
  }

  destroyJoint(joint) {
    if (!joint) {
      return joint
    }

    if (joint.type === "GrabJoint") {
      const key = `${joint.body.id}-grab`
      const stored = this.#joints.get(key)

      if (!stored) return joint

      const body = stored.body

      for (let i = 0; i < body.jointKeys.length; ++i) {
        if (body.jointKeys[i] == key) {
          body.jointKeys[i] = body.jointKeys[body.jointKeys.length - 1]
          body.jointKeys.pop()
          --i
        }
      }

      this.#joints.delete(key)
      for (let i = 0; i < this.#jointKeys.length; ++i) {
        if (this.#jointKeys[i] == key) {
          this.#jointKeys[i] = this.#jointKeys[this.#jointKeys.length - 1]
          this.#jointKeys.pop()
          --i
        }
      }
    } else {
      const key = `${joint.bodyA.id}-${joint.bodyB.id}`
      const stored = this.#joints.get(key)

      if (!stored) return joint

      const { bodyA, bodyB } = stored

      for (let i = 0; i < bodyA.jointKeys.length; ++i) {
        if (bodyA.jointKeys[i] == key) {
          bodyA.jointKeys[i] = bodyA.jointKeys[bodyA.jointKeys.length - 1]
          bodyA.jointKeys.pop()
          --i
        }
      }

      for (let i = 0; i < bodyB.jointKeys.length; ++i) {
        if (bodyB.jointKeys[i] == key) {
          bodyB.jointKeys[i] = bodyB.jointKeys[bodyB.jointKeys.length - 1]
          bodyB.jointKeys.pop()
          --i
        }
      }

      this.#joints.delete(key)
      for (let i = 0; i < this.#jointKeys.length; ++i) {
        if (this.#jointKeys[i] == key) {
          this.#jointKeys[i] = this.#jointKeys[this.#jointKeys.length - 1]
          this.#jointKeys.pop()
          --i
        }
      }
    }

    return joint
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

  queryPoint(pointX, pointY, result = []) {
    return this.#dynamicTree.queryPoint(pointX, pointY, result)
  }

  queryAABB(aabb, result = []) {
    return this.#dynamicTree.queryAABB(aabb, result)
  }

  simulate(dt) {
    dt /= this.substeps

    for (let step = 0; step < this.substeps; ++step) {
      // Reset
      this.island.visited.clear()
      this.#oldContactPoints.clear()
      for (let i = 0; i < this.#bodies.length; ++i) {
        this.#bodies[i].contactKeys.length = 0
      }

      // Cache contact points and preserve sleeping contacts
      for (let i = 0; i < this.#contactKeys.length; ++i) {
        const key = this.#contactKeys[i]
        const { bodyA, bodyB, contactPoints } = this.#contacts.get(key)

        this.#oldContactPoints.set(key, contactPoints)

        if (
          (bodyA.isSleeping && bodyB.isSleeping) ||
          (bodyA.isStatic && bodyB.isSleeping) ||
          (bodyA.isSleeping && bodyB.isStatic)
        ) {
          bodyA.contactKeys.push(key)
          bodyB.contactKeys.push(key)
          continue
        }

        this.#contacts.delete(key)
        this.#contactKeys[i] = this.#contactKeys[this.#contactKeys.length - 1]
        this.#contactKeys.pop()
        --i
      }

      // Collision detection
      for (let i = 0; i < this.#bodies.length; ++i) {
        const bodyA = this.#bodies[i]
        const idA = bodyA.id

        // Broadphase
        this.#nearby.length = 0
        this.queryAABB(bodyA.aabb, this.#nearby)

        for (let j = 0; j < this.#nearby.length; ++j) {
          const bodyB = this.#nearby[j]
          const idB = bodyB.id

          if (
            idA === idB ||
            !bodyA.aabb.overlaps(bodyB.aabb) ||
            (bodyA.isStatic && bodyB.isStatic) ||
            (bodyA.isSleeping && bodyB.isSleeping) ||
            (bodyA.isStatic && bodyB.isSleeping) ||
            (bodyA.isSleeping && bodyB.isStatic)
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

      let islandId = 0
      for (let i = 0; i < this.#bodies.length; ++i) {
        const body = this.#bodies[i]

        if (this.island.visited.has(body.id) || body.isStatic) {
          continue
        }

        this.island.clear()
        this.island.build(body)
        this.island.solve(dt)

        islandId++

        for (let j = 0; j < this.island.bodies.length; ++j) {
          this.island.bodies[j].islandId = islandId
        }
      }
    }
  }
}
