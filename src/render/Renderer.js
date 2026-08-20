import Input from './Input.js'
import Graphics from './Graphics.js'
import Camera from './Camera.js'

export default class Renderer {
  constructor(canvas, options = {}) {
    this.canvas = canvas
    this.input = new Input(canvas)
    this.camera = new Camera(0, 0, 0, 100)
    this.gfx = new Graphics(canvas, options)
    
    this.onDown = null
    this.onMove = null
    this.onUp = null
    this.setup()
    
    this.bodies = options.bodies ?? true
    this.wireframe = options.wireframe ?? false
    this.epa = options.epa ?? false
    this.normal = options.normal ?? false
    this.point = options.point ?? false
    this.impulse = options.impulse ?? false
    this.ref = options.ref ?? false
    this.inc = options.inc ?? false
    this.aabb = options.aabb ?? false
    this.bvh = options.bvh ?? false
    this.debugsColor = '#ffffff'
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
  }
  
  setup() {
    const { input, camera, canvas } = this
    
    input.onDown = (x, y) => {
      const centerX = canvas.width * 0.5
      const centerY = canvas.height * 0.5
      const x0 = (x - centerX) / camera.scale
      const y0 = (y - centerY) / camera.scale

      const grabX = camera.x + (x0 * camera.cos + y0 * camera.sin)
      const grabY = camera.y + (-x0 * camera.sin + y0 * camera.cos)

      if (typeof this.onDown === 'function') {
        this.onDown(grabX, grabY)
      }
    }
    input.onMove = (dx, dy, x, y) => {
      const worldDx = dx * camera.cos + dy * camera.sin
      const worldDy = -dx * camera.sin + dy * camera.cos
      
      const centerX = canvas.width * 0.5
      const centerY = canvas.height * 0.5
      const x0 = (x - centerX) / camera.scale
      const y0 = (y - centerY) / camera.scale

      const grabX = camera.x + (x0 * camera.cos + y0 * camera.sin)
      const grabY = camera.y + (-x0 * camera.sin + y0 * camera.cos)

      if (typeof this.onMove === 'function') {
        this.onMove(worldDx / camera.scale, worldDy / camera.scale, grabX, grabY)
      }
    }
    input.onUp = () => {
      if (typeof this.onUp === 'function') {
        this.onUp()
      }
    }
    input.onPan = (dx, dy) => camera.move(dx, dy)
    input.onZoom = factor => camera.zoom(factor)
    input.onRotate = delta => camera.rotate(delta)
    input.onResize = (w, h) => this.setSize(w, h)
    
    this.setSize(innerWidth, innerHeight)
  }
  
  setSize(width, height) {
    this.gfx.setSize(width, height)
  }
  
  draw(world) {
    const { gfx, camera, canvas, wireframe, islandColors } = this
    const debugsColor = this.debugsColor
    const strokeWidth = 1 / camera.scale
    
    gfx.clear(0, 0, canvas.width, canvas.height)
    gfx.setCamera(camera)

    if (this.bodies) {
      // Draw bodies
      for (let i = 0; i < world.bodies.length; ++i) {
        const {
          position,
          cos,
          sin,
          isSleeping,
          isStatic,
          islandId,
          fixtures
        } = world.bodies[i]

        const strokeColor = wireframe
          ? debugsColor
          : 'black'
        const fillColor = isSleeping || isStatic
          ? 'gray'
          : islandColors[islandId % islandColors.length]

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
                wireframe,
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
                fillColor,
                strokeColor,
                wireframe,
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
                fillColor,
                strokeColor,
                wireframe,
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
              strokeColor: debugsColor,
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
        strokeColor: debugsColor,
        wireframe: true,
        strokeWidth
      }

      if (this.aabb) {
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

      if (this.bvh) {
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
          ref,
          inc,
          overlap,
          polytope,
          contactPoints
        } = contact

        if (this.epa && polytope) {
          const originX = 0
          const originY = 0
          const mtvX = normalX * overlap
          const mtvY = normalY * overlap

          gfx.drawPolygon(originX, originY, 1, 0, {
            vertices: polytope,
            wireframe: true,
            strokeColor: debugsColor,
            strokeWidth
          })
          gfx.drawLine(originX, originY, mtvX, mtvY, {
            strokeColor: debugsColor,
            strokeWidth
          })
          gfx.drawCircle(originX, originY, 1, 0, {
            radius: 2 / camera.scale,
            fillColor: debugsColor,
            noStroke: true
          })
        }

        if (this.ref && ref) {
          gfx.drawLine(ref.edge[0], ref.edge[1], ref.edge[2], ref.edge[3], {
            strokeColor: debugsColor,
            strokeWidth
          })
        }

        if (this.inc && inc) {
          gfx.drawLine(inc.edge[0], inc.edge[1], inc.edge[2], inc.edge[3], {
            strokeColor: debugsColor,
            strokeWidth
          })
        }

        for (const cp of contactPoints) {
          if (this.impulse) {
            gfx.drawNormal(cp.pointX, cp.pointY, normalX, normalY, {
              length: cp.normalImpulse,
              showHead: false,
              strokeColor: debugsColor,
              strokeWidth
            })
          }

          if (this.point) {
            gfx.drawCircle(cp.pointX, cp.pointY, 1, 0, {
              radius: 1.5 / camera.scale,
              fillColor: debugsColor,
              noStroke: true,
              strokeWidth
            })
          }

          if (this.normal) {
            gfx.drawNormal(cp.pointX, cp.pointY, normalX, normalY, {
              length: 8 / camera.scale,
              strokeColor: debugsColor,
              strokeWidth
            })
          }
        }
      }
    }

    gfx.setCamera(null)
  }
}
