import DynamicTree from './DynamicTree.js'
import Vector from './Vector.js'
import Vertices from './Vertices.js'
import RigidBody from './RigidBody.js'
import Circle from './Circle.js'
import Collider from './Collider.js'
import Island from './Island.js'
import Pool from './Pool.js'

export default class World {
	constructor(options = {}) {
		this.bodies = []
		this.joints = new Map()
		this.contacts = new Map()
		this.contactKeys = []
		this.jointKeys = []
		this.oldContactPoints = new Map()
		this.dynamicTree = new DynamicTree()
		this.nearby = []
		this.collider = new Collider()
		this.contactPool = new Pool(() => ({}), 16)

		this.gravity = options.gravity ?? new Vector(0, 9.81)
		this.substeps = options.substeps ?? 1
		this.primaryIterations = options.primaryIterations ?? 8
		this.secondaryIterations = options.secondaryIterations ?? 4
		this.nodeMargin = options.nodeMargin ?? 0.1
		this.useBlockSolver = options.useBlockSolver ?? true
		this.useSleeping = options.useSleeping ?? true
		this.island = new Island(this, options)
	}

	clear() {
		for (let i = 0; i < this.bodies.length; ++i) {
			this.destroyBody(this.bodies[i])
			--i
		}
		this.oldContactPoints.clear()

		for (let i = 0; i < this.contactKeys.length; ++i) {
			const key = this.contactKeys[i]
			const { poolIndex } = this.contacts.get(key)

			this.contactPool.deallocate(poolIndex)
		}

		this.contacts.clear()
		this.contactKeys.length = 0

		this.joints.clear()
		this.jointKeys.length = 0

		return this
	}

	createJoint(joint) {
		if (!joint) {
			return joint
		}

		if (joint.type === 'GrabJoint') {
			const key = `${joint.type}-${joint.id}`

			if (this.joints.has(key)) {
				this.destroyJoint(joint)
			}

			joint.key = key
			joint.body.jointKeys.push(key)

			this.createBody(joint.body)
			this.joints.set(key, joint)
			this.jointKeys.push(key)
		} else {
			const key = `${joint.type}-${joint.id}`

			if (this.joints.has(key)) {
				this.destroyJoint(joint)
			}

			joint.key = key
			joint.bodyA.jointKeys.push(key)
			joint.bodyB.jointKeys.push(key)

			this.createBody(joint.bodyA)
			this.createBody(joint.bodyB)
			this.joints.set(key, joint)
			this.jointKeys.push(key)
		}

		return joint
	}

	createJoints(joints) {
		for (const joint of joints) {
			this.createJoint(joint)
		}
	}

	destroyJoint(joint) {
		if (!joint) {
			return joint
		}

		const key = joint.key
		const stored = this.joints.get(key)

		if (!stored) {
			return joint
		}

		if (joint.type === 'GrabJoint') {
			const body = stored.body

			for (let i = 0; i < body.jointKeys.length; ++i) {
				if (body.jointKeys[i] == key) {
					body.jointKeys[i] = body.jointKeys[body.jointKeys.length - 1]
					body.jointKeys.pop()
					--i
				}
			}
		} else {
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
		}

		this.joints.delete(key)
		for (let i = 0; i < this.jointKeys.length; ++i) {
			if (this.jointKeys[i] == key) {
				this.jointKeys[i] = this.jointKeys[this.jointKeys.length - 1]
				this.jointKeys.pop()
				--i
			}
		}

		return joint
	}

	destroyJoints(joints) {
		for (const joint of joints) {
			this.destroyJoint(joint)
		}
	}

	createBody(body) {
		if (body.index >= 0) {
			return body
		}

		this.dynamicTree.insertBody(body, this.nodeMargin)
		this.bodies.push(body)
		body.index = this.bodies.length - 1

		return body
	}

	createBodies(bodies) {
		for (const body of bodies) {
			this.createBody(body)
		}
	}

	destroyBody(body) {
		const index = body.index
		const last = this.bodies.length - 1

		if (index < 0 || index > last) {
			return body
		}

		this.dynamicTree.removeBody(body)

		if (index != last) {
			this.bodies[index] = this.bodies[last]
			this.bodies[index].index = index
		}

		this.bodies.pop()
		body.index = -1

		return body
	}

	destroyBodies(bodies) {
		for (const body of bodies) {
			this.destroyBody(body)
		}
	}

	scaleBody(body, value) {
		for (let i = 0; i < body.fixtures.length; ++i) {
			const shape = body.fixtures[i]

			shape.scale(value)
			shape.updateWorldVertices(
				body.position.x,
				body.position.y,
				body.cos,
				body.sin
			)
		}

		for (let i = 0; i < body.contactKeys.length; ++i) {
			const contact = this.contacts.get(body.contactKeys[i])
			let other = contact.bodyB

			if (body.id === other.id) {
				other = contact.bodyA
			}

			other.awake()
		}

		for (let i = 0; i < body.jointKeys.length; ++i) {
			const joint = this.joints.get(body.jointKeys[i])

			if (joint.type === 'GrabJoint') {
				continue
			}

			let other = joint.bodyB

			if (body.id === other.id) {
				other = joint.bodyA
			}

			other.awake()
		}

		body.awake()
		body.updateMass()
		body.updateAABB()
		this.dynamicTree.removeBody(body)
		this.dynamicTree.insertBody(body, this.nodeMargin)
	}

	scaleBodies(bodies, value) {
		for (const body of bodies) {
			this.scaleBody(body, value)
		}
	}

	queryPoint(pointX, pointY, result = []) {
		return this.dynamicTree.queryPoint(pointX, pointY, result)
	}

	queryAABB(aabb, result = []) {
		return this.dynamicTree.queryAABB(aabb, result)
	}

	simulate(dt) {
		dt /= this.substeps

		for (let step = 0; step < this.substeps; ++step) {
			// Reset
			this.island.visited.clear()
			this.oldContactPoints.clear()
			for (let i = 0; i < this.bodies.length; ++i) {
				this.bodies[i].contactKeys.length = 0
			}

			// Cache contact points and preserve sleeping contacts
			for (let i = 0; i < this.contactKeys.length; ++i) {
				const key = this.contactKeys[i]
				const { bodyA, bodyB, contactPoints, poolIndex } =
					this.contacts.get(key)

				this.oldContactPoints.set(key, contactPoints)

				if (
					(bodyA.isSleeping && bodyB.isSleeping) ||
					(bodyA.isStatic && bodyB.isSleeping) ||
					(bodyA.isSleeping && bodyB.isStatic)
				) {
					bodyA.contactKeys.push(key)
					bodyB.contactKeys.push(key)
					continue
				}

				this.contacts.delete(key)
				this.contactPool.deallocate(poolIndex)
				this.contactKeys[i] = this.contactKeys[this.contactKeys.length - 1]
				this.contactKeys.pop()
				--i
			}

			// Collision detection
			for (let i = 0; i < this.bodies.length; ++i) {
				const bodyA = this.bodies[i]
				const idA = bodyA.id

				// Broadphase
				this.nearby.length = 0
				this.queryAABB(bodyA.aabb, this.nearby)

				for (let j = 0; j < this.nearby.length; ++j) {
					const bodyB = this.nearby[j]
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
							const keyBase = 0xf4240
							const key =
								idA < idB
									? `${idA * keyBase + idB}-${sA.id * keyBase + sB.id}`
									: `${idB * keyBase + idA}-${sB.id * keyBase + sA.id}`

							if (this.contacts.has(key)) {
								continue
							}

							// Narrowphase
							const contactI = this.contactPool.allocate()
							const contact = this.collider.collide(
								sA,
								sB,
								this.contactPool.at(contactI)
							)

							if (!contact) {
								this.contactPool.deallocate(contactI)
								continue
							}

							contact.poolIndex = contactI
							contact.bodyA = bodyA
							contact.bodyB = bodyB

							bodyA.contactKeys.push(key)
							bodyB.contactKeys.push(key)

							this.contactKeys.push(key)
							this.contacts.set(key, contact)
						}
					}
				}
			}

			let islandId = 0
			for (let i = 0; i < this.bodies.length; ++i) {
				const body = this.bodies[i]

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

	render(renderer, options = {}) {
		const {
			aabb = false,
			bvh = false,
			contact = false,
			impulse = false,
			velocity = false,
			island = true,
			fill = true,
			stroke = true
		} = options
		const { gfx, camera, pixelDensity, debugColor } = renderer
		const strokeWidth = pixelDensity / camera.scale

		gfx.clear()
		gfx.save()
		gfx.setCamera(camera)

		// Draw bodies
		for (let i = 0; i < this.bodies.length; ++i) {
			const {
				id: bodyId,
				position,
				cos,
				sin,
				isSleeping,
				isStatic,
				islandId,
				fixtures
			} = this.bodies[i]

			const strokeColor =
				!fill && !isSleeping && !isStatic
					? debugColor
					: !fill && (isSleeping || isStatic)
						? 'gray'
						: 'black'

			const fillColor =
				!island && !isSleeping && !isStatic
					? gfx.color(bodyId)
					: island && !isSleeping && !isStatic
						? gfx.color(islandId)
						: 'gray'

			for (const shape of fixtures) {
				switch (shape.type) {
					case 'polygon':
						gfx.drawPolygon(position.x, position.y, cos, sin, {
							offsetX: shape.offset.x,
							offsetY: shape.offset.y,
							cos: shape.cos,
							sin: shape.sin,
							vertices: shape.vertices,
							fill,
							fillColor,
							stroke,
							strokeColor,
							strokeWidth
						})
						break
					case 'rectangle':
						gfx.drawRectangle(position.x, position.y, cos, sin, {
							offsetX: shape.offset.x,
							offsetY: shape.offset.y,
							cos: shape.cos,
							sin: shape.sin,
							width: shape.width,
							height: shape.height,
							axis: true,
							fill,
							fillColor,
							stroke,
							strokeColor,
							strokeWidth
						})
						break
					case 'circle':
						gfx.drawCircle(position.x, position.y, cos, sin, {
							offsetX: shape.offset.x,
							offsetY: shape.offset.y,
							cos: shape.cos,
							sin: shape.sin,
							radius: shape.radius,
							axis: true,
							fill,
							fillColor,
							stroke,
							strokeColor,
							strokeWidth
						})
						break
					case 'capsule':
						gfx.drawCapsule(position.x, position.y, cos, sin, {
							offsetX: shape.offset.x,
							offsetY: shape.offset.y,
							cos: shape.cos,
							sin: shape.sin,
							length: shape.length,
							radius: shape.radius,
							axis: true,
							fill,
							fillColor,
							stroke,
							strokeColor,
							strokeWidth
						})
						break
					case 'line':
						if (fill || stroke) {
							gfx.drawLine(
								shape.center1.x,
								shape.center1.y,
								shape.center2.x,
								shape.center2.y,
								{
									strokeColor: fill ? fillColor : strokeColor,
									strokeWidth
								}
							)
						}
						break
				}
			}
		}

		// Draw joints
		if (fill || stroke) {
			for (let i = 0; i < this.jointKeys.length; ++i) {
				const joint = this.joints.get(this.jointKeys[i])

				if (joint.type == 'GrabJoint') {
					const cos = joint.body.cos
					const sin = joint.body.sin
					const anchorX = joint.anchorX * cos - joint.anchorY * sin
					const anchorY = joint.anchorX * sin + joint.anchorY * cos

					gfx.drawLine(
						joint.body.position.x + anchorX,
						joint.body.position.y + anchorY,
						joint.target.x,
						joint.target.y,
						{
							strokeColor: debugColor,
							strokeWidth
						}
					)
					continue
				}
			}
		}

		// Debugs
		{
			const debugOptions = {
				length: strokeWidth,
				head: false,
				fill: false,
				strokeWidth,
				strokeColor: debugColor
			}

			if (aabb) {
				for (let i = 0; i < this.bodies.length; ++i) {
					const body = this.bodies[i]

					for (const s of body.fixtures) {
						gfx.drawAABB(s.aabb, debugOptions)
					}

					if (body.fixtures.length > 1) {
						gfx.drawAABB(body.aabb, debugOptions)
					}
				}
			}

			if (bvh) {
				this.dynamicTree.traverse(node => {
					gfx.drawAABB(node.aabb, debugOptions)
				})
			}

			if (velocity) {
				for (let i = 0; i < this.bodies.length; ++i) {
					const body = this.bodies[i]

					if (body.isSleeping) {
						continue
					}

					gfx.drawNormal(
						body.position.x,
						body.position.y,
						body.linearVelocity.x,
						body.linearVelocity.y,
						debugOptions
					)
				}
			}

			// Draw Contacts
			for (let i = 0; i < this.contactKeys.length; ++i) {
				const {
					bodyA,
					bodyB,
					normalX,
					normalY,
					overlap,
					contactPoints,
					contactCount
				} = this.contacts.get(this.contactKeys[i])

				for (let j = 0; j < contactCount; ++j) {
					const cp = contactPoints[j]

					if (contact) {
						gfx.drawCircle(cp.pointX, cp.pointY, 1, 0, {
							radius: strokeWidth * 2,
							fillColor: debugColor,
							stroke: false,
							axis: true,
							strokeWidth
						})

						gfx.drawNormal(cp.pointX, cp.pointY, normalX, normalY, {
							length: strokeWidth * 10,
							strokeColor: debugColor,
							strokeWidth,
							head: false
						})
					}

					if (impulse) {
						gfx.drawNormal(cp.pointX, cp.pointY, normalX, normalY, {
							length: cp.normalImpulse,
							head: false,
							strokeColor: debugColor,
							strokeWidth
						})
					}
				}
			}
		}

		gfx.restore()
	}
}
