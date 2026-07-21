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
    const color = options.color ?? "#0e0e0e"
    const baseline = options.baseline ?? "top"
    const size = options.size ?? 12
    const align = options.align ?? "start"

    this.#ctx.fillStyle = color
    this.#ctx.font = `normal ${size}px verdana`
    this.#ctx.textBaseline = baseline
    this.#ctx.textAlign = align
    this.#ctx.fillText(text, x, y)
    return this
  }

  drawCircle(x, y, cos = 1, sin = 0, options = {}) {
    const offsetX = options.offsetX ?? 0
    const offsetY = options.offsetY ?? 0
    const localCos = options.cos ?? 1
    const localSin = options.sin ?? 0
    const radius = options.radius ?? null
    const wireframe = options.wireframe ?? false
    const noStroke = options.noStroke ?? false
    const noLine = options.noLine ?? false
    const strokeColor = options.strokeColor ?? "#0e0e0e"
    const strokeWidth = options.strokeWidth ?? 1

    if (!radius) {
      return this
    }

    const totalCos = cos * localCos - sin * localSin
    const totalSin = cos * localSin + sin * localCos

    const worldX = x + (offsetX * totalCos - offsetY * totalSin)
    const worldY = y + (offsetX * totalSin + offsetY * totalCos)
    const anchorX = worldX + radius * totalCos
    const anchorY = worldY + radius * totalSin

    this.#ctx.beginPath()
    this.#ctx.arc(worldX, worldY, radius, 0, Math.PI * 2)

    if (!wireframe) {
      this.#ctx.fillStyle = options.fillColor ?? `gray`
      this.#ctx.fill()
    }

    if (noStroke) {
      return this
    }

    if (!noLine) {
      this.#ctx.moveTo(worldX, worldY)
      this.#ctx.lineTo(anchorX, anchorY)
    }

    this.#ctx.lineWidth = strokeWidth
    this.#ctx.strokeStyle = strokeColor
    this.#ctx.stroke()
    return this
  }

  drawCapsule(x, y, cos, sin, options = {}) {
    const offsetX = options.offsetX ?? 0
    const offsetY = options.offsetY ?? 0
    const localCos = options.cos ?? 1
    const localSin = options.sin ?? 0
    const length = options.length ?? 0
    const radius = options.radius ?? 0
    const wireframe = options.wireframe ?? false
    const noStroke = options.noStroke ?? false
    const noLine = options.noLine ?? false
    const strokeColor = options.strokeColor ?? "#0e0e0e"
    const strokeWidth = options.strokeWidth ?? 1

    if (!length || !radius) {
      return this
    }

    const totalCos = cos * localCos - sin * localSin
    const totalSin = cos * localSin + sin * localCos

    const c0X = offsetX
    const c0Y = offsetY - length * 0.5
    const c1X = offsetX
    const c1Y = offsetY + length * 0.5

    const x0 = x + (c0X * totalCos - c0Y * totalSin)
    const y0 = y + (c0X * totalSin + c0Y * totalCos)
    const x1 = x + (c1X * totalCos - c1Y * totalSin)
    const y1 = y + (c1X * totalSin + c1Y * totalCos)

    const perpX = -(y1 - y0)
    const perpY = x1 - x0

    const startAngle = Math.atan2(perpY, perpX)
    const endAngle = Math.atan2(-perpY, -perpX)

    this.#ctx.beginPath()
    this.#ctx.arc(x0, y0, radius, startAngle, endAngle)
    this.#ctx.arc(x1, y1, radius, endAngle, startAngle)
    this.#ctx.closePath()

    if (!wireframe) {
      this.#ctx.fillStyle = options.fillColor ?? `gray`
      this.#ctx.fill()
    }

    if (noStroke) {
      return this
    }

    if (!noLine) {
      this.#ctx.moveTo(x0, y0)
      this.#ctx.lineTo(x1, y1)
    }

    this.#ctx.lineWidth = strokeWidth
    this.#ctx.strokeStyle = strokeColor
    this.#ctx.stroke()
    return this
  }

  drawLine(x, y, cos = 1, sin = 0, options = {}) {
    const offsetX = options.offsetX ?? 0
    const offsetY = options.offsetY ?? 0
    const localCos = options.cos ?? 1
    const localSin = options.sin ?? 0
    const length = options.length ?? null
    const strokeColor = options.strokeColor ?? "#0e0e0e"
    const strokeWidth = options.strokeWidth ?? 1

    if (!length) {
      return this
    }

    const totalCos = cos * localCos - sin * localSin
    const totalSin = cos * localSin + sin * localCos

    const c0X = offsetX
    const c0Y = offsetY - length * 0.5
    const c1X = offsetX
    const c1Y = offsetY + length * 0.5

    const x0 = x + (c0X * totalCos - c0Y * totalSin)
    const y0 = y + (c0X * totalSin + c0Y * totalCos)
    const x1 = x + (c1X * totalCos - c1Y * totalSin)
    const y1 = y + (c1X * totalSin + c1Y * totalCos)

    this.#ctx.beginPath()
    this.#ctx.moveTo(x0, y0)
    this.#ctx.lineTo(x1, y1)

    this.#ctx.lineWidth = strokeWidth
    this.#ctx.strokeStyle = strokeColor
    this.#ctx.stroke()
    return this
  }

  drawPolygon(x, y, cos = 1, sin = 0, options = {}) {
    const offsetX = options.offsetX ?? 0
    const offsetY = options.offsetY ?? 0
    const localCos = options.cos ?? 1
    const localSin = options.sin ?? 0
    const vertices = options.vertices ?? null
    const wireframe = options.wireframe ?? false
    const noStroke = options.noStroke ?? false
    const strokeColor = options.strokeColor ?? "#0e0e0e"
    const strokeWidth = options.strokeWidth ?? 1

    if (!vertices) {
      return this
    }

    const totalCos = cos * localCos - sin * localSin
    const totalSin = cos * localSin + sin * localCos

    const localX = offsetX + vertices[0]
    const localY = offsetY + vertices[1]
    const worldX = x + (localX * totalCos - localY * totalSin)
    const worldY = y + (localX * totalSin + localY * totalCos)

    this.#ctx.beginPath()
    this.#ctx.moveTo(worldX, worldY)
    for (let i = 2; i < vertices.length; i += 2) {
      const localX = offsetX + vertices[i]
      const localY = offsetY + vertices[i + 1]
      const worldX = x + (localX * totalCos - localY * totalSin)
      const worldY = y + (localX * totalSin + localY * totalCos)

      this.#ctx.lineTo(worldX, worldY)
    }
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
