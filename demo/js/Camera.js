export default class Camera {
  constructor(x, y, angle, scale, option = {}) {
    this.x = x
    this.y = y
    this.angle = angle
    this.scale = scale
  }

  get cos() {
    return Math.cos(this.angle)
  }

  get sin() {
    return Math.sin(this.angle)
  }

  move(dx, dy) {
    const cos = Math.cos(this.angle)
    const sin = Math.sin(this.angle)

    this.x -= (dx * cos + dy * sin) / this.scale
    this.y -= (-dx * sin + dy * cos) / this.scale
  }

  zoom(zoomFactor) {
    const minZoom = 0.00001
    const maxZoom = 10000.0

    this.scale = Math.max(minZoom, Math.min(this.scale * zoomFactor, maxZoom))
  }

  rotate(delta) {
    this.angle += delta
  }
}
