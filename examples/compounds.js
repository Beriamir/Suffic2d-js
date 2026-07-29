export default function compounds(s2, world, option = {}) {
  const {
    columns = 4,
    rows = 10,
    spacing = 0.024,
    size = 0.24,
    groundWidth = 1000,
    groundHeight = 0.48,
    centerX = 0,
    bottomY = 0
  } = option

  const ground = new s2.RigidBody(centerX, bottomY + groundHeight, 0, {
    isStatic: true
  }).createPolygon(
    new Float32Array([
      -groundWidth,
      -groundHeight,
      groundWidth,
      -groundHeight,
      groundWidth,
      groundHeight,
      -groundWidth,
      groundHeight
    ]),
    {
      fillColor: "gray",
      strokeColor: "dimgray"
    }
  )

  world.createBody(ground)

  const gap = 1.25
  const colStep = size * 4 * gap + spacing
  const rowStep = size * 4 * gap + spacing
  const startX = centerX - (columns - 1) * colStep * 0.5

  for (let col = 0; col < columns; ++col) {
    const x = startX + col * colStep

    for (let row = 0; row < rows; ++row) {
      const y = bottomY - size * 2 - spacing - row * rowStep

      const body = new s2.RigidBody(x, y, 0, {
        friction: 0.3
      })

      if (row % 2 == 0) {
        const rectangle = [-size, -size, size, -size, size, size, -size, size]

        body
          .createPolygon(new Float32Array(rectangle), {
            offset: new s2.Vector(-size * gap, -size * gap)
          })
          .createPolygon(new Float32Array(rectangle), {
            offset: new s2.Vector(size * gap, -size * gap)
          })
          .createPolygon(new Float32Array(rectangle), {
            offset: new s2.Vector(size * gap, size * gap)
          })
          .createPolygon(new Float32Array(rectangle), {
            offset: new s2.Vector(-size * gap, size * gap)
          })
      } else {
        const radius = size

        body
          .createCircle(radius, {
            offset: new s2.Vector(-size * gap, -size * gap)
          })
          .createCircle(radius, {
            offset: new s2.Vector(size * gap, -size * gap)
          })
          .createCircle(radius, {
            offset: new s2.Vector(size * gap, size * gap)
          })
          .createCircle(radius, {
            offset: new s2.Vector(-size * gap, size * gap)
          })
      }
      world.createBody(body)
    }
  }
}
