import BlockSolver from "./BlockSolver.js"
import ContactSolver from "./ContactSolver.js"

export default class Island {
  #blockSolver = new BlockSolver()
  #contactSolver = new ContactSolver()

  constructor(world) {
    this.world = world
    this.bodies = []
    this.contactKeys = []
    this.jointKeys = []
    this.sleepingTime = 1 // Second
    this.isSleeping = false
    this.stack = []
    this.visited = new Set()
  }

  clear() {
    this.bodies.length = 0
    this.contactKeys.length = 0
    this.jointKeys.length = 0
    this.isSleeping = false
    this.stack.length = 0
  }

  build(seed) {
    let minSleepingTime = Infinity

    this.stack.push(seed)
    while (this.stack.length > 0) {
      const body = this.stack.pop()

      if (this.visited.has(body.id) || body.isStatic) {
        continue
      }

      this.bodies.push(body)
      this.visited.add(body.id)

      // Contacts
      for (let i = 0; i < body.contactKeys.length; ++i) {
        const key = body.contactKeys[i]
        const contact = this.world.contacts.get(key)
        const other =
          contact.bodyA.id == body.id ? contact.bodyB : contact.bodyA

        if (this.visited.has(other.id)) {
          continue
        }

        this.stack.push(other)
        this.contactKeys.push(key)
      }

      // Joints
      for (let i = 0; i < body.jointKeys.length; ++i) {
        const key = body.jointKeys[i]
        const joint = this.world.joints.get(key)

        if (joint.type == "GrabJoint") {
          this.isSleeping = false
          body.awake()
        } else {
          const other = joint.bodyA.id == body.id ? joint.bodyB : joint.bodyA

          if (this.visited.has(other.id)) {
            continue
          }

          this.stack.push(other)
        }

        this.jointKeys.push(key)
      }

      if (body.sleepingTime < minSleepingTime) {
        minSleepingTime = body.sleepingTime
      }
    }

    if (minSleepingTime >= this.sleepingTime) {
      this.isSleeping = true
    }
  }

  solve(dt) {
    for (let i = 0; i < this.bodies.length; ++i) {
      const body = this.bodies[i]

      body.isSleeping = this.isSleeping

      if (body.isSleeping) {
        body.linearVelocity.zero()
        body.angularVelocity = 0
      }

      if (body.isSleeping || body.canSleep()) {
        body.sleepingTime += dt
      } else {
        this.isSleeping = false
        body.awake()
      }

      if (!body.isSleeping) {
        body.linearVelocity.addMulV(this.world.gravity, dt)
      }
    }

    const contactSolver = this.world.useBlockSolver
      ? this.#blockSolver
      : this.#contactSolver

    // Prepare and Warm start joints
    for (let i = 0; i < this.jointKeys.length; ++i) {
      const joint = this.world.joints.get(this.jointKeys[i])

      joint.prepare(dt)
      joint.warmStart()
    }

    // Prepare and Warm start contacts
    for (let i = 0; i < this.contactKeys.length; ++i) {
      const key = this.contactKeys[i]
      const contact = this.world.contacts.get(key)
      const oldContactPoints = this.world.oldContactPoints.get(key)

      contactSolver.prepare(contact, dt)
      contactSolver.warmStart(contact, oldContactPoints)
    }

    if (this.isSleeping) {
      return
    }

    this.contactKeys.sort((a, b) => {
      if (a < b) return -1
      if (a > b) return 1
      return 0
    })

    this.jointKeys.sort((a, b) => {
      if (a < b) return -1
      if (a > b) return 1
      return 0
    })

    // Solve + baumgarte bias
    for (let i = 0; i < this.world.velocityIterations; ++i) {
      for (let j = 0; j < this.jointKeys.length; ++j) {
        this.world.joints.get(this.jointKeys[j]).solve(true)
      }
      for (let j = 0; j < this.contactKeys.length; ++j) {
        contactSolver.solve(this.world.contacts.get(this.contactKeys[j]), true)
      }
    }

    // Update position and broadphase
    for (let i = 0; i < this.bodies.length; ++i) {
      const body = this.bodies[i]

      body.position.addMulV(body.linearVelocity, dt)
      body.rotation += body.angularVelocity * dt
      body.updateColor()

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
      this.world.dynamicTree.updateBody(body, this.world.nodeMargin)
    }

    // Relax + restitution
    for (let i = 0; i < this.world.positionIterations; ++i) {
      for (let j = 0; j < this.jointKeys.length; ++j) {
        this.world.joints.get(this.jointKeys[j]).solve(false)
      }
      for (let j = 0; j < this.contactKeys.length; ++j) {
        contactSolver.solve(this.world.contacts.get(this.contactKeys[j]), false)
      }
    }
  }
}
