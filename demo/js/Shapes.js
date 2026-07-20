export default class Shapes {
  constructor() {}

  static triangle(radius) {
    const height = Math.sqrt(3) * radius
    return new Float32Array([
      0,
      -height / 2,
      radius,
      height / 2,
      -radius,
      height / 2
    ])
  }

  static rectangle(width, height) {
    return new Float32Array([
      -width,
      -height,
      width,
      -height,
      width,
      height,
      -width,
      height
    ])
  }

  static circle(radius, roundness = 16) {
    const vertices = []

    for (let i = 0; i < roundness; ++i) {
      const angle = (i * Math.PI * 2) / roundness
      const x = radius * Math.cos(angle)
      const y = radius * Math.sin(angle)

      vertices.push(x, y)
    }

    return new Float32Array(vertices)
  }

  static capsule(length, radius, roundness = 8) {
    const vertices = []
    const halfLength = length * 0.5

    for (let i = 0; i <= roundness; i++) {
      const t = (i * Math.PI) / roundness
      vertices.push(Math.cos(t) * radius, halfLength + Math.sin(t) * radius)
    }

    for (let i = 0; i <= roundness; i++) {
      const t = Math.PI + (i * Math.PI) / roundness
      vertices.push(Math.cos(t) * radius, -halfLength + Math.sin(t) * radius)
    }

    return new Float32Array(vertices)
  }
}
