export default class Graphics {
  #ctx
  constructor(canvas, options = {}) {
    this.#ctx = canvas.getContext("2d", options)
    this.canvas = canvas
  }

  clear(x, y, w, h) {
    this.#ctx.clearRect(x, y, w, h)
    return this
  }

  setCamera(camera) {
    if (!camera) {
      this.#ctx.restore()
      return this
    }

    const scale = camera.scale
    const cos = camera.cos
    const sin = camera.sin

    const centerX = this.canvas.width * 0.5
    const centerY = this.canvas.height * 0.5
    const translateX = camera.x * cos - camera.y * sin
    const translateY = camera.x * sin + camera.y * cos

    this.#ctx.save()
    this.#ctx.setTransform(
      cos * scale,
      sin * scale,
      -sin * scale,
      cos * scale,
      centerX - translateX * scale,
      centerY - translateY * scale
    )
    return this
  }

  drawText(x, y, text, options = {}) {
    const fillColor = options.fillColor ?? "#0e0e0e"
    const baseline = options.baseline ?? "top"
    const fontSize = options.fontSize ?? 12
    const align = options.align ?? "start"

    this.#ctx.fillStyle = fillColor
    this.#ctx.font = `normal ${fontSize}px verdana`
    this.#ctx.textBaseline = baseline
    this.#ctx.textAlign = align
    this.#ctx.fillText(text, x, y)
    return this
  }

  drawCircle(x, y, cos = 1, sin = 0, options = {}) {
    const localX = options.offsetX ?? 0
    const localY = options.offsetY ?? 0
    const radius = options.radius ?? null
    const wireframe = options.wireframe ?? false
    const noStroke = options.noStroke ?? false
    const noLine = options.noLine ?? false
    const strokeColor = options.strokeColor ?? "#0e0e0e"
    const strokeWidth = options.strokeWidth ?? 1

    if (!radius) {
      return this
    }

    const worldX = x + (localX * cos - localY * sin)
    const worldY = y + (localX * sin + localY * cos)
    const anchorX = worldX + (radius * cos - 0 * sin)
    const anchorY = worldY + (radius * sin + 0 * cos)

    this.#ctx.beginPath()
    this.#ctx.arc(worldX, worldY, radius, 0, Math.PI * 2)

    if (!noLine) {
      this.#ctx.moveTo(worldX, worldY)
      this.#ctx.lineTo(anchorX, anchorY)
    }

    if (!wireframe) {
      this.#ctx.fillStyle = options.fillColor ?? `gray`
      this.#ctx.fill()
    }

    if (noStroke) {
      return this
    }

    this.#ctx.lineWidth = strokeWidth
    this.#ctx.strokeStyle = strokeColor
    this.#ctx.stroke()
    return this
  }

  drawCapsule(x, y, cos, sin, options = {}) {
    const localX = options.offsetX ?? 0
    const localY = options.offsetY ?? 0
    const length = options.length ?? 0
    const radius = options.radius ?? 0
    const wireframe = options.wireframe ?? false
    const noStroke = options.noStroke ?? false
    const strokeColor = options.strokeColor ?? "#0e0e0e"
    const strokeWidth = options.strokeWidth ?? 1

    if (!length || !radius) {
      return this
    }

    const halfLength = length * 0.5

    const x1 = localX
    const y1 = localY - halfLength
    const x2 = localX
    const y2 = localY + halfLength

    const cx1 = x + (x1 * cos - y1 * sin)
    const cy1 = y + (x1 * sin + y1 * cos)
    const cx2 = x + (x2 * cos - y2 * sin)
    const cy2 = y + (x2 * sin + y2 * cos)

    const perpX = -(cy2 - cy1)
    const perpY = cx2 - cx1

    const startAngle = Math.atan2(perpY, perpX)
    const endAngle = Math.atan2(-perpY, -perpX)

    this.#ctx.beginPath()
    this.#ctx.arc(cx1, cy1, radius, startAngle, endAngle)
    this.#ctx.arc(cx2, cy2, radius, endAngle, startAngle)
    this.#ctx.closePath()
    this.#ctx.moveTo(cx1, cy1)
    this.#ctx.lineTo(cx2, cy2)

    if (!wireframe) {
      this.#ctx.fillStyle = options.fillColor ?? `gray`
      this.#ctx.fill()
    }

    if (noStroke) {
      return this
    }

    this.#ctx.lineWidth = strokeWidth
    this.#ctx.strokeStyle = strokeColor
    this.#ctx.stroke()
    return this
  }

  drawPolygon(x, y, cos = 1, sin = 0, options = {}) {
    const localX = options.offsetX ?? 0
    const localY = options.offsetY ?? 0
    const vertices = options.vertices ?? null
    const wireframe = options.wireframe ?? false
    const noStroke = options.noStroke ?? false
    const strokeColor = options.strokeColor ?? "#0e0e0e"
    const strokeWidth = options.strokeWidth ?? 1

    if (!vertices) {
      return this
    }

    let x0 = localX + vertices[0]
    let y0 = localY + vertices[1]
    let worldX = x + (x0 * cos - y0 * sin)
    let worldY = y + (x0 * sin + y0 * cos)

    this.#ctx.beginPath()
    this.#ctx.moveTo(worldX, worldY)
    for (let i = 2; i < vertices.length; i += 2) {
      x0 = localX + vertices[i]
      y0 = localY + vertices[i + 1]
      worldX = x + (x0 * cos - y0 * sin)
      worldY = y + (x0 * sin + y0 * cos)
      this.#ctx.lineTo(worldX, worldY)
    }
    x0 = localX + vertices[0]
    y0 = localY + vertices[1]
    worldX = x + (x0 * cos - y0 * sin)
    worldY = y + (x0 * sin + y0 * cos)
    this.#ctx.lineTo(worldX, worldY)

    if (!wireframe) {
      this.#ctx.fillStyle = options.fillColor ?? `gray`
      this.#ctx.fill()
    }

    if (noStroke) {
      return this
    }

    this.#ctx.lineWidth = strokeWidth
    this.#ctx.strokeStyle = strokeColor
    this.#ctx.stroke()
    return this
  }

  drawLine(x, y, cos = 1, sin = 0, options = {}) {
    const localX = options.offsetX ?? 0
    const localY = options.offsetY ?? 0
    const vertices = options.vertices ?? null
    const strokeColor = options.strokeColor ?? "#0e0e0e"
    const strokeWidth = options.strokeWidth ?? 1

    if (!vertices) {
      return this
    }

    let x0 = localX + vertices[0]
    let y0 = localY + vertices[1]
    let worldX = x + (x0 * cos - y0 * sin)
    let worldY = y + (x0 * sin + y0 * cos)

    this.#ctx.beginPath()
    this.#ctx.moveTo(worldX, worldY)
    for (let i = 2; i < vertices.length; i += 2) {
      x0 = localX + vertices[i]
      y0 = localY + vertices[i + 1]
      worldX = x + (x0 * cos - y0 * sin)
      worldY = y + (x0 * sin + y0 * cos)
      this.#ctx.lineTo(worldX, worldY)
    }
    this.#ctx.lineWidth = strokeWidth
    this.#ctx.strokeStyle = strokeColor
    this.#ctx.stroke()
    return this
  }

  drawAABB(aabb, options = {}) {
    const wireframe = options.wireframe ?? false
    const noStroke = options.noStroke ?? false
    const strokeColor = options.strokeColor ?? "#0e0e0e"
    const strokeWidth = options.strokeWidth ?? 1

    this.#ctx.beginPath()
    this.#ctx.moveTo(aabb.minX, aabb.minY)
    this.#ctx.lineTo(aabb.maxX, aabb.minY)
    this.#ctx.lineTo(aabb.maxX, aabb.maxY)
    this.#ctx.lineTo(aabb.minX, aabb.maxY)
    this.#ctx.lineTo(aabb.minX, aabb.minY)

    if (!wireframe) {
      this.#ctx.fillStyle = options.fillColor ?? `gray`
      this.#ctx.fill()
    }

    if (noStroke) {
      return this
    }

    this.#ctx.lineWidth = strokeWidth
    this.#ctx.strokeStyle = strokeColor
    this.#ctx.stroke()
    return this
  }

  drawNormal(x, y, normalX, normalY, options = {}) {
    const strokeColor = options.strokeColor ?? "#0e0e0e"
    const strokeWidth = options.strokeWidth ?? 1
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

    this.#ctx.beginPath()
    this.#ctx.moveTo(x, y)
    this.#ctx.lineTo(endX, endY)
    this.#ctx.moveTo(leftX, leftY)
    this.#ctx.lineTo(endX, endY)
    this.#ctx.lineTo(rightX, rightY)
    this.#ctx.lineWidth = strokeWidth
    this.#ctx.strokeStyle = strokeColor
    this.#ctx.stroke()
    return this
  }
}
