export default (s2, world, options = {}) => {
  const {
    columns = 1,
    rows = 20,
    length = 0.48,
    radius = 0.24,
    spacing = 0.024,
    groundWidth = 1000,
    groundHeight = 0.48,
    centerX = 0,
    bottomY = 0
  } = options

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

  const colStep = radius * 2 + spacing
  const rowStep = length + radius * 2 + spacing
  const startX = centerX - (columns - 1) * colStep * 0.5

  for (let col = 0; col < columns; ++col) {
    const x = startX + col * colStep

    for (let row = 0; row < rows; ++row) {
      const y = bottomY - (length * 0.5 + radius) - row * rowStep

      const body = new s2.RigidBody(x, y, 0, {
        friction: 0.3
      }).createCapsule(length, radius, {
        roundness: 9
      })

      world.createBody(body)
    }
  }
}
