export default class Graphics {
	constructor(canvas, options = {}) {
		this.canvas = canvas
		this.ctx = canvas.getContext('2d', options)
	}

	save() {
		this.ctx.save()
		return this
	}

	restore() {
		this.ctx.restore()
		return this
	}

	clear() {
		const width = this.canvas.width
		const height = this.canvas.height

		this.ctx.clearRect(0, 0, width, height)
		return this
	}

	setCamera(camera) {
		const { scale, cos, sin, x, y } = camera

		const centerX = this.canvas.width * 0.5
		const centerY = this.canvas.height * 0.5
		const translateX = x * cos - y * sin
		const translateY = x * sin + y * cos

		this.ctx.setTransform(
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
		const color = options.color ?? 'dimgray'
		const baseline = options.baseline ?? 'top'
		const size = options.size ?? 12
		const align = options.align ?? 'start'

		this.ctx.fillStyle = color
		this.ctx.font = `normal ${size}px verdana`
		this.ctx.textBaseline = baseline
		this.ctx.textAlign = align
		this.ctx.fillText(text, x, y)
		return this
	}

	drawCircle(x, y, cos = 1, sin = 0, options = {}) {
		const offsetX = options.offsetX ?? 0
		const offsetY = options.offsetY ?? 0
		const localCos = options.cos ?? 1
		const localSin = options.sin ?? 0
		const radius = options.radius ?? null
		const fill = options.fill ?? true
		const stroke = options.stroke ?? true
		const axis = options.axis ?? true
		const strokeColor = options.strokeColor ?? 'dimgray'
		const strokeWidth = options.strokeWidth ?? 1

		if (!radius) {
			return this
		}

		const localX = offsetX
		const localY = offsetY
		const worldX = x + (localX * cos - localY * sin)
		const worldY = y + (localX * sin + localY * cos)

		this.ctx.beginPath()
		this.ctx.arc(worldX, worldY, radius, 0, Math.PI * 2)

		if (fill) {
			this.ctx.fillStyle = options.fillColor ?? `gray`
			this.ctx.fill()
		}

		if (!stroke) {
			return this
		}

		if (axis) {
			const axisX = worldX + radius * (cos * localCos - sin * localSin)
			const axisY = worldY + radius * (cos * localSin + sin * localCos)

			this.ctx.moveTo(worldX, worldY)
			this.ctx.lineTo(axisX, axisY)
		}

		this.ctx.lineWidth = strokeWidth
		this.ctx.strokeStyle = strokeColor
		this.ctx.stroke()
		return this
	}

	drawCapsule(x, y, cos, sin, options = {}) {
		const offsetX = options.offsetX ?? 0
		const offsetY = options.offsetY ?? 0
		const localCos = options.cos ?? 1
		const localSin = options.sin ?? 0
		const length = options.length ?? 0
		const radius = options.radius ?? 0
		const fill = options.fill ?? true
		const stroke = options.stroke ?? true
		const axis = options.axis ?? true
		const strokeColor = options.strokeColor ?? 'dimgray'
		const strokeWidth = options.strokeWidth ?? 1

		if (!length || !radius) {
			return this
		}

		const c0X = 0
		const c0Y = -length * 0.5
		const c1X = 0
		const c1Y = length * 0.5

		const local0X = offsetX + (c0X * localCos - c0Y * localSin)
		const local0Y = offsetY + (c0X * localSin + c0Y * localCos)
		const local1X = offsetX + (c1X * localCos - c1Y * localSin)
		const local1Y = offsetY + (c1X * localSin + c1Y * localCos)

		const world0X = x + (local0X * cos - local0Y * sin)
		const world0Y = y + (local0X * sin + local0Y * cos)
		const world1X = x + (local1X * cos - local1Y * sin)
		const world1Y = y + (local1X * sin + local1Y * cos)

		const perpX = -(world1Y - world0Y)
		const perpY = world1X - world0X

		const startAngle = Math.atan2(perpY, perpX)
		const endAngle = Math.atan2(-perpY, -perpX)

		this.ctx.beginPath()
		this.ctx.arc(world0X, world0Y, radius, startAngle, endAngle)
		this.ctx.arc(world1X, world1Y, radius, endAngle, startAngle)
		this.ctx.closePath()

		if (fill) {
			this.ctx.fillStyle = options.fillColor ?? `gray`
			this.ctx.fill()
		}

		if (!stroke) {
			return this
		}

		if (axis) {
			this.ctx.moveTo(world0X, world0Y)
			this.ctx.lineTo(world1X, world1Y)
		}

		this.ctx.lineWidth = strokeWidth
		this.ctx.strokeStyle = strokeColor
		this.ctx.stroke()
		return this
	}

	drawRectangle(x, y, cos = 1, sin = 0, options = {}) {
		const offsetX = options.offsetX ?? 0
		const offsetY = options.offsetY ?? 0
		const localCos = options.cos ?? 1
		const localSin = options.sin ?? 0
		const width = options.width ?? null
		const height = options.height ?? null
		const fill = options.fill ?? true
		const stroke = options.stroke ?? true
		const strokeColor = options.strokeColor ?? 'dimgray'
		const strokeWidth = options.strokeWidth ?? 1
		const axis = options.axis ?? true

		if (!width || !height) {
			return this
		}

		let vertexX = -width
		let vertexY = -height
		let localX = offsetX + (vertexX * localCos - vertexY * localSin)
		let localY = offsetY + (vertexX * localSin + vertexY * localCos)
		let worldX = x + (localX * cos - localY * sin)
		let worldY = y + (localX * sin + localY * cos)

		this.ctx.beginPath()
		this.ctx.moveTo(worldX, worldY)

		vertexX = width
		vertexY = -height
		localX = offsetX + (vertexX * localCos - vertexY * localSin)
		localY = offsetY + (vertexX * localSin + vertexY * localCos)
		worldX = x + (localX * cos - localY * sin)
		worldY = y + (localX * sin + localY * cos)

		this.ctx.lineTo(worldX, worldY)

		vertexX = width
		vertexY = height
		localX = offsetX + (vertexX * localCos - vertexY * localSin)
		localY = offsetY + (vertexX * localSin + vertexY * localCos)
		worldX = x + (localX * cos - localY * sin)
		worldY = y + (localX * sin + localY * cos)

		this.ctx.lineTo(worldX, worldY)

		vertexX = -width
		vertexY = height
		localX = offsetX + (vertexX * localCos - vertexY * localSin)
		localY = offsetY + (vertexX * localSin + vertexY * localCos)
		worldX = x + (localX * cos - localY * sin)
		worldY = y + (localX * sin + localY * cos)

		this.ctx.lineTo(worldX, worldY)

		vertexX = -width
		vertexY = -height
		localX = offsetX + (vertexX * localCos - vertexY * localSin)
		localY = offsetY + (vertexX * localSin + vertexY * localCos)
		worldX = x + (localX * cos - localY * sin)
		worldY = y + (localX * sin + localY * cos)

		this.ctx.lineTo(worldX, worldY)

		if (fill) {
			this.ctx.fillStyle = options.fillColor ?? `gray`
			this.ctx.fill()
		}

		if (!stroke) {
			return this
		}

		if (axis) {
			const length = width < height ? width * 0.5 : height * 0.5
			const worldX = x + (offsetX * cos - offsetY * sin)
			const worldY = y + (offsetX * sin + offsetY * cos)
			const axisCos = localCos * cos - localSin * sin
			const axisSin = localCos * sin + localSin * cos

			let vertexX = 0
			let vertexY = -1
			let axisX = vertexX * axisCos - vertexY * axisSin
			let axisY = vertexX * axisSin + vertexY * axisCos

			this.ctx.moveTo(worldX, worldY)
			this.ctx.lineTo(worldX + axisX * length, worldY + axisY * length)

			vertexX = 1
			vertexY = 0
			axisX = vertexX * axisCos - vertexY * axisSin
			axisY = vertexX * axisSin + vertexY * axisCos

			this.ctx.moveTo(worldX, worldY)
			this.ctx.lineTo(worldX + axisX * length, worldY + axisY * length)

			vertexX = 0
			vertexY = 1
			axisX = vertexX * axisCos - vertexY * axisSin
			axisY = vertexX * axisSin + vertexY * axisCos

			this.ctx.moveTo(worldX, worldY)
			this.ctx.lineTo(worldX + axisX * length, worldY + axisY * length)

			vertexX = -1
			vertexY = 0
			axisX = vertexX * axisCos - vertexY * axisSin
			axisY = vertexX * axisSin + vertexY * axisCos

			this.ctx.moveTo(worldX, worldY)
			this.ctx.lineTo(worldX + axisX * length, worldY + axisY * length)
		}

		this.ctx.lineWidth = strokeWidth
		this.ctx.strokeStyle = strokeColor
		this.ctx.stroke()
		return this
	}

	drawPolygon(x, y, cos = 1, sin = 0, options = {}) {
		const offsetX = options.offsetX ?? 0
		const offsetY = options.offsetY ?? 0
		const localCos = options.cos ?? 1
		const localSin = options.sin ?? 0
		const vertices = options.vertices ?? null
		const fill = options.fill ?? true
		const stroke = options.stroke ?? true
		const strokeColor = options.strokeColor ?? 'dimgray'
		const strokeWidth = options.strokeWidth ?? 1

		if (!vertices) {
			return this
		}

		const localX = offsetX + (vertices[0] * localCos - vertices[1] * localSin)
		const localY = offsetY + (vertices[0] * localSin + vertices[1] * localCos)
		const worldX = x + (localX * cos - localY * sin)
		const worldY = y + (localX * sin + localY * cos)

		this.ctx.beginPath()
		this.ctx.moveTo(worldX, worldY)
		for (let i = 2; i < vertices.length; i += 2) {
			const localX =
				offsetX + (vertices[i] * localCos - vertices[i + 1] * localSin)
			const localY =
				offsetY + (vertices[i] * localSin + vertices[i + 1] * localCos)

			const worldX = x + (localX * cos - localY * sin)
			const worldY = y + (localX * sin + localY * cos)

			this.ctx.lineTo(worldX, worldY)
		}
		this.ctx.lineTo(worldX, worldY)

		if (fill) {
			this.ctx.fillStyle = options.fillColor ?? `gray`
			this.ctx.fill()
		}

		if (!stroke) {
			return this
		}

		this.ctx.lineWidth = strokeWidth
		this.ctx.strokeStyle = strokeColor
		this.ctx.stroke()
		return this
	}

	drawLine(x0, y0, x1, y1, options = {}) {
		const strokeColor = options.strokeColor ?? 'dimgray'
		const strokeWidth = options.strokeWidth ?? 1

		this.ctx.beginPath()
		this.ctx.moveTo(x0, y0)
		this.ctx.lineTo(x1, y1)
		this.ctx.lineWidth = strokeWidth
		this.ctx.strokeStyle = strokeColor
		this.ctx.stroke()
		return this
	}

	drawAABB(aabb, options = {}) {
		const fill = options.fill ?? true
		const stroke = options.stroke ?? true
		const strokeColor = options.strokeColor ?? 'dimgray'
		const strokeWidth = options.strokeWidth ?? 1

		this.ctx.beginPath()
		this.ctx.moveTo(aabb.minX, aabb.minY)
		this.ctx.lineTo(aabb.maxX, aabb.minY)
		this.ctx.lineTo(aabb.maxX, aabb.maxY)
		this.ctx.lineTo(aabb.minX, aabb.maxY)
		this.ctx.lineTo(aabb.minX, aabb.minY)

		if (fill) {
			this.ctx.fillStyle = options.fillColor ?? `gray`
			this.ctx.fill()
		}

		if (!stroke) {
			return this
		}

		this.ctx.lineWidth = strokeWidth
		this.ctx.strokeStyle = strokeColor
		this.ctx.stroke()
		return this
	}

	drawNormal(x, y, normalX, normalY, options = {}) {
		const strokeColor = options.strokeColor ?? 'dimgray'
		const strokeWidth = options.strokeWidth ?? 1
		const length = options.length ?? 1
		const head = options.head ?? true

		const endX = x + normalX * length
		const endY = y + normalY * length

		this.ctx.beginPath()
		this.ctx.moveTo(x, y)
		this.ctx.lineTo(endX, endY)
		if (head) {
			const head = length * 0.3
			const backX = -normalX
			const backY = -normalY
			const perpX = -normalY
			const perpY = normalX

			const leftX = endX + backX * head - perpX * head
			const leftY = endY + backY * head - perpY * head
			const rightX = endX + backX * head + perpX * head
			const rightY = endY + backY * head + perpY * head

			this.ctx.moveTo(leftX, leftY)
			this.ctx.lineTo(endX, endY)
			this.ctx.lineTo(rightX, rightY)
		}
		this.ctx.lineWidth = strokeWidth
		this.ctx.strokeStyle = strokeColor
		this.ctx.stroke()
		return this
	}

	drawImage(x, y, cos, sin, option = {}) {
		const offsetX = option.offsetX ?? 0
		const offsetY = option.offsetY ?? 0
		const localCos = option.cos ?? 1
		const localSin = option.sin ?? 0
		const image = option.image ?? null
		const width = option.width ?? 0.24
		const height = option.height ?? 0.24

		if (image && !image.complete) return

		const angle = Math.atan2(
			localCos * sin + localSin * cos,
			localCos * cos - localSin * sin
		)
		const worldX = x + offsetX
		const worldY = y + offsetY

		this.ctx.save()
		this.ctx.translate(worldX, worldY)
		this.ctx.rotate(angle)
		this.ctx.drawImage(image, -width, -height, width * 2, height * 2)
		this.ctx.restore()
		return this
	}
}
