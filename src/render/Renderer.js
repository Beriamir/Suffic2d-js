import Graphics from './Graphics.js'
import Camera from './Camera.js'

export default class Renderer {
	constructor(canvas, options = {}) {
		this.canvas = canvas
		this.camera = new Camera(0, 0, 0, 100)
		this.gfx = new Graphics(canvas, options)
		this.resolution = options.resolution ?? 1 // before dividing anything with the camera.scale, multiply the value by the resolution first.
		this.debugColor = '#ffffff'
		this.debugs = {
			bodies: options.bodies ?? true,
			island: options.island ?? false,
			wireframe: options.wireframe ?? false,
			normal: options.normal ?? false,
			point: options.point ?? false,
			impulse: options.impulse ?? false,
			aabb: options.aabb ?? false,
			bvh: options.bvh ?? false
		}
		this.islandColors = [
			'#0ea5e9',
			'#3b82f6',
			'#6366f1',
			'#8b5cf6',
			'#a855f7',
			'#d946ef',
			'#ec4899',
			'#f43f5e',
			'#ef4444',
			'#f97316',
			'#eab308',
			'#84cc16',
			'#22c55e',
			'#10b981',
			'#14b8a6',
			'#06b6d4'
		]
		this.status = {
			fps: 0,
			bodies: 0,
			contacts: 0,
			joints: 0
		}

		this.resize(
			parseFloat(getComputedStyle(canvas).width),
			parseFloat(getComputedStyle(canvas).height)
		)
	}

	resize(w, h) {
		this.gfx.setSize(w, h, this.resolution)
	}

	statusList(out = []) {
		for (const key of Object.keys(this.status)) {
			out.push(key)
		}

		return out
	}

	debugList(out = []) {
		for (const key of Object.keys(this.debugs)) {
			out.push(key)
		}

		return out
	}

	onDown(x, y) {
		const { camera, canvas, resolution } = this

		const centerX = canvas.width * 0.5
		const centerY = canvas.height * 0.5
		const x0 = (x * resolution - centerX) / camera.scale
		const y0 = (y * resolution - centerY) / camera.scale

		const pointX = camera.x + (x0 * camera.cos + y0 * camera.sin)
		const pointY = camera.y + (-x0 * camera.sin + y0 * camera.cos)

		return [pointX, pointY]
	}

	onMove(dx, dy, x = 0, y = 0) {
		const { camera, canvas, resolution } = this

		const moveX = dx * camera.cos + dy * camera.sin
		const moveY = -dx * camera.sin + dy * camera.cos

		const centerX = canvas.width * 0.5
		const centerY = canvas.height * 0.5
		const x0 = (x * resolution - centerX) / camera.scale
		const y0 = (y * resolution - centerY) / camera.scale

		const pointX = camera.x + (x0 * camera.cos + y0 * camera.sin)
		const pointY = camera.y + (-x0 * camera.sin + y0 * camera.cos)

		return [
			(moveX * resolution) / camera.scale,
			(moveY * resolution) / camera.scale,
			pointX,
			pointY
		]
	}

	onUp() {}

	pan(dx, dy) {
		this.camera.move(dx, dy)
	}

	zoom(factor) {
		this.camera.zoom(factor)
	}

	rotate(delta) {
		this.camera.rotate(delta)
	}

	draw(world, dt = 0.016) {
		const { gfx, camera, canvas, debugs, islandColors, resolution } = this
		const debugColor = this.debugColor
		const strokeWidth = resolution / camera.scale

		gfx.clear(0, 0, canvas.width, canvas.height)
		gfx.setCamera(camera)

		if (debugs.bodies) {
			// Draw bodies
			for (let i = 0; i < world.bodies.length; ++i) {
				const {
					id: bodyId,
					position,
					cos,
					sin,
					isSleeping,
					isStatic,
					islandId,
					fixtures
				} = world.bodies[i]

				const strokeColor =
					debugs.wireframe && !isSleeping && !isStatic
						? debugColor
						: debugs.wireframe && (isSleeping || isStatic)
							? 'gray'
							: 'black'

				const fillColor =
					!debugs.island && !isSleeping && !isStatic
						? islandColors[bodyId % islandColors.length]
						: debugs.island && !isSleeping && !isStatic
							? islandColors[islandId % islandColors.length]
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
								fillColor,
								strokeColor,
								wireframe: debugs.wireframe,
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
								fillColor,
								strokeColor,
								wireframe: debugs.wireframe,
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
								fillColor,
								strokeColor,
								wireframe: debugs.wireframe,
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
								fillColor,
								strokeColor,
								wireframe: debugs.wireframe,
								strokeWidth
							})
							break
						case 'line':
							gfx.drawLine(
								shape.center1.x,
								shape.center1.y,
								shape.center2.x,
								shape.center2.y,
								{
									strokeColor: fillColor,
									strokeWidth
								}
							)
							break
					}
				}
			}

			// Draw joints
			for (let i = 0; i < world.jointKeys.length; ++i) {
				const joint = world.joints.get(world.jointKeys[i])

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

		// Draw debugs
		{
			const options = {
				strokeColor: debugColor,
				wireframe: true,
				strokeWidth
			}

			if (debugs.aabb) {
				for (let i = 0; i < world.bodies.length; ++i) {
					const body = world.bodies[i]

					for (const s of body.fixtures) {
						gfx.drawAABB(s.aabb, options)
					}

					if (body.fixtures.length > 1) {
						gfx.drawAABB(body.aabb, options)
					}
				}
			}

			if (debugs.bvh) {
				world.dynamicTree.traverse(node => {
					gfx.drawAABB(node.aabb, options)
				})
			}

			for (let i = 0; i < world.contactKeys.length; ++i) {
				const contact = world.contacts.get(world.contactKeys[i])
				const {
					bodyA,
					bodyB,
					normalX,
					normalY,
					overlap,
					contactPoints,
					contactCount
				} = contact

				for (let j = 0; j < contactCount; ++j) {
					const cp = contactPoints[j]

					if (debugs.impulse) {
						gfx.drawNormal(cp.pointX, cp.pointY, normalX, normalY, {
							length: cp.normalImpulse,
							head: false,
							strokeColor: debugColor,
							strokeWidth
						})
					}

					if (debugs.point) {
						gfx.drawCircle(cp.pointX, cp.pointY, 1, 0, {
							radius: (2 * resolution) / camera.scale,
							fillColor: debugColor,
							stroke: false,
							axis: true,
							strokeWidth
						})
					}

					if (debugs.normal) {
						gfx.drawNormal(cp.pointX, cp.pointY, normalX, normalY, {
							length: (10 * resolution) / camera.scale,
							strokeColor: debugColor,
							strokeWidth,
							head: false
						})
					}
				}
			}
		}

		gfx.setCamera(null)

		// Update status
		{
			this.status.bodies = world.bodies.length
			this.status.contacts = world.contacts.size
			this.status.joints = world.joints.size
			this.status.fps = 1 / dt
		}
	}
}
