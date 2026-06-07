export default class Graphics {
  constructor(canvas, options = {}) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d', options)
  }

  get centerX() {
    return this.canvas.width * 0.5
  }

  get centerY() {
    return this.canvas.height * 0.5
  }

  status(x, y, list, options = {}) {
    if (typeof list !== 'object') {
      return
    }

    const fontSize = options.fontSize ?? 12
    const fillColor = options.fillColor ?? 'white'
    const height = options.height ?? 1.5

    this.ctx.fillStyle = fillColor
    this.ctx.font = `normal ${fontSize}px verdana`
    this.ctx.textBaseline = 'top'
    this.ctx.textAlign = 'start'
    for (let i = 0; i < list.length; i++) {
      this.ctx.fillText(list[i], x, y + fontSize * height * i)
    }
  }

  clear(x, y, w, h) {
    this.ctx.clearRect(x, y, w, h)
  }

  drawCircle(x, y, cos = 1, sin = 0, options = {}) {
    const localX = options.offsetX ?? 0
    const localY = options.offsetY ?? 0
    const radius = options.radius ?? null
    const wireframe = options.wireframe ?? false

    if (!radius) {
      return
    }

    const worldX = x + (localX * cos - localY * sin)
    const worldY = y + (localX * sin + localY * cos)

    this.ctx.beginPath()
    this.ctx.arc(worldX, worldY, radius, 0, Math.PI * 2)
    if (!wireframe) {
      this.ctx.fillStyle = options.fillColor ?? `gray`
      this.ctx.fill()
    }
    this.ctx.strokeStyle = options.strokeColor ?? `white`
    this.ctx.stroke()
  }

  drawPolygon(x, y, cos = 1, sin = 0, options = {}) {
    const localX = options.offsetX ?? 0
    const localY = options.offsetY ?? 0
    const vertices = options.vertices ?? null
    const wireframe = options.wireframe ?? false

    if (!vertices) {
      return
    }

    let x0 = localX + vertices[0]
    let y0 = localY + vertices[1]
    let worldX = x + (x0 * cos - y0 * sin)
    let worldY = y + (x0 * sin + y0 * cos)

    this.ctx.beginPath()
    this.ctx.moveTo(worldX, worldY)
    for (let i = 2; i < vertices.length; i += 2) {
      x0 = localX + vertices[i]
      y0 = localY + vertices[i + 1]
      worldX = x + (x0 * cos - y0 * sin)
      worldY = y + (x0 * sin + y0 * cos)
      this.ctx.lineTo(worldX, worldY)
    }
    x0 = localX + vertices[0]
    y0 = localY + vertices[1]
    worldX = x + (x0 * cos - y0 * sin)
    worldY = y + (x0 * sin + y0 * cos)
    this.ctx.lineTo(worldX, worldY)
    if (!wireframe) {
      this.ctx.fillStyle = options.fillColor ?? `gray`
      this.ctx.fill()
    }
    this.ctx.strokeStyle = options.strokeColor ?? `white`
    this.ctx.stroke()
  }

  drawLine(x, y, cos = 1, sin = 0, options = {}) {
    const localX = options.offsetX ?? 0
    const localY = options.offsetY ?? 0
    const vertices = options.vertices ?? null

    if (!vertices) {
      return
    }

    let x0 = localX + vertices[0]
    let y0 = localY + vertices[1]
    let worldX = x + (x0 * cos - y0 * sin)
    let worldY = y + (x0 * sin + y0 * cos)

    this.ctx.beginPath()
    this.ctx.moveTo(worldX, worldY)
    for (let i = 2; i < vertices.length; i += 2) {
      x0 = localX + vertices[i]
      y0 = localY + vertices[i + 1]
      worldX = x + (x0 * cos - y0 * sin)
      worldY = y + (x0 * sin + y0 * cos)
      this.ctx.lineTo(worldX, worldY)
    }
    this.ctx.strokeStyle = options.strokeColor ?? `white`
    this.ctx.stroke()
  }

  drawAABB(aabb, options = {}) {
    const wireframe = options.wireframe ?? false

    this.ctx.beginPath()
    this.ctx.moveTo(aabb.minX, aabb.minY)
    this.ctx.lineTo(aabb.maxX, aabb.minY)
    this.ctx.lineTo(aabb.maxX, aabb.maxY)
    this.ctx.lineTo(aabb.minX, aabb.maxY)
    this.ctx.lineTo(aabb.minX, aabb.minY)

    if (!wireframe) {
      this.ctx.fillStyle = options.fillColor ?? `gray`
      this.ctx.fill()
    }
    this.ctx.strokeStyle = options.strokeColor ?? `white`
    this.ctx.stroke()
  }

  drawNormal(x, y, normalX, normalY, options = {}) {
    const length = options.length ?? 20

    const head = length * 0.3
    const backX = -normalX
    const backY = -normalY
    const perpX = -normalY
    const perpY = normalX

    const endX = x + normalX * length
    const endY = y + normalY * length
    const leftX = endX + backX * head - perpX * head
    const leftY = endY + backY * head - perpY * head
    const rightX = endX + backX * head + perpX * head
    const rightY = endY + backY * head + perpY * head

    this.ctx.beginPath()
    this.ctx.moveTo(x, y)
    this.ctx.lineTo(endX, endY)
    this.ctx.lineTo(leftX, leftY)
    this.ctx.moveTo(endX, endY)
    this.ctx.lineTo(rightX, rightY)
    this.ctx.strokeStyle = options.strokeColor ?? `white`
    this.ctx.stroke()
  }
}
