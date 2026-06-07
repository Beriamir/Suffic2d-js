export default class AABB {
  constructor(minX, minY, maxX, maxY) {
    this.minX = minX ?? 0
    this.minY = minY ?? 0
    this.maxX = maxX ?? 0
    this.maxY = maxY ?? 0
  }

  get perimeter() {
    const width = this.maxX - this.minX
    const height = this.maxY - this.minY

    return 2 * (width + height)
  }

  get meanX() {
    return 0.5 * (this.minX + this.maxX)
  }

  get meanY() {
    return 0.5 * (this.minY + this.maxY)
  }

  set(minX, minY, maxX, maxY) {
    this.minX = minX
    this.minY = minY
    this.maxX = maxX
    this.maxY = maxY
    return this
  }

  overlaps(aabb) {
    return (
      this.minX <= aabb.maxX &&
      this.minY <= aabb.maxY &&
      this.maxX >= aabb.minX &&
      this.maxY >= aabb.minY
    )
  }

  contains(aabb) {
    return (
      this.minX <= aabb.minX &&
      this.minY <= aabb.minY &&
      this.maxX >= aabb.maxX &&
      this.maxY >= aabb.maxY
    )
  }

  union(aabb, out = new AABB()) {
    out.minX = Math.min(this.minX, aabb.minX)
    out.minY = Math.min(this.minY, aabb.minY)
    out.maxX = Math.max(this.maxX, aabb.maxX)
    out.maxY = Math.max(this.maxY, aabb.maxY)

    return out
  }

  unionPerimeter(aabb) {
    const minX = Math.min(this.minX, aabb.minX)
    const minY = Math.min(this.minY, aabb.minY)
    const maxX = Math.max(this.maxX, aabb.maxX)
    const maxY = Math.max(this.maxY, aabb.maxY)

    const width = maxX - minX
    const height = maxY - minY

    return 2 * (width + height)
  }

  union2xPerimeter(aabb1, aabb2) {
    const minX = Math.min(this.minX, aabb1.minX, aabb2.minX)
    const minY = Math.min(this.minY, aabb1.minY, aabb2.minY)
    const maxX = Math.max(this.maxX, aabb1.maxX, aabb2.maxX)
    const maxY = Math.max(this.maxY, aabb1.maxY, aabb2.maxY)

    const width = maxX - minX
    const height = maxY - minY

    return 2 * (width + height)
  }

  enlarge(margin) {
    this.minX -= margin
    this.minY -= margin
    this.maxX += margin
    this.maxY += margin
    return this
  }

  copy(aabb) {
    this.minX = aabb.minX
    this.minY = aabb.minY
    this.maxX = aabb.maxX
    this.maxY = aabb.maxY
    return this
  }
}
