export default class Vector {
  constructor(x = 0, y = 0) {
    this.x = x
    this.y = y
  }
  set(x, y) {
    this.x = x
    this.y = y
    return this
  }
  copy(vector) {
    this.x = vector.x
    this.y = vector.y
    return this
  }
  clone() {
    return new Vector(this.x, this.y)
  }
  sub(vector) {
    this.x -= vector.x
    this.y -= vector.y
    return this
  }
  add(vector) {
    this.x += vector.x
    this.y += vector.y
    return this
  }
  scale(s) {
    this.x *= s
    this.y *= s
    return this
  }
  negate() {
    this.x *= -1
    this.y *= -1
    return this
  }
  perp() {
    const t = this.x

    this.x = -this.y
    this.y = t
    return this
  }
  zero() {
    this.x = 0
    this.y = 0
    return this
  }
  normalize() {
    const magSq = this.magSq()

    if (magSq !== 0) {
      const mag = 1 / Math.sqrt(magSq)

      this.scale(mag)
    } else {
      this.zero()
    }
    return this
  }
  copyMulV(vector, s) {
    this.x = vector.x * s
    this.y = vector.y * s
    return this
  }
  subMulV(vector, s) {
    this.x -= vector.x * s
    this.y -= vector.y * s
    return this
  }
  addMulV(vector, s) {
    this.x += vector.x * s
    this.y += vector.y * s
    return this
  }
  dot(vector) {
    return this.x * vector.x + this.y * vector.y
  }
  cross(vector) {
    return this.x * vector.y - this.y * vector.x
  }
  magSq() {
    return this.x * this.x + this.y * this.y
  }
  isZero() {
    const epsilon = 1e-12

    return this.magSq() < epsilon * epsilon
  }
  toString() {
    return `(${this.x},${this.y})`
  }
  log(text = "") {
    console.log(text + " " + this.toString())
    return this
  }
  static sub(vec1, vec2) {
    return new Vector(vec1.x - vec2.x, vec1.y - vec2.y)
  }
  static add(vec1, vec2) {
    return new Vector(vec1.x + vec2.x, vec1.y + vec2.y)
  }
  static scale(vec, s) {
    return new Vector(vec.x * s, vec.y * s)
  }
  static perp(vec) {
    return new Vector(-vec.y, vec.x)
  }
}
