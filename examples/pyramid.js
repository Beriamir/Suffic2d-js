export default function pyramid(s2, world, option = {}) {
  const {
    rows = 15,
    spacing = 0.024,
    boxWidth = 0.24,
    boxHeight = 0.24,
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

  const colStep = boxWidth * 2 + spacing
  const rowStep = boxHeight * 2 + spacing

  for (let row = 0; row < rows; ++row) {
    const count = rows - row
    const startX = centerX - (count - 1) * colStep * 0.5
    const y = bottomY - boxHeight - row * rowStep

    for (let col = 0; col < count; ++col) {
      const body = new s2.RigidBody(startX + col * colStep, y, 0, {
        friction: 0.3
      }).createPolygon(
        new Float32Array([
          -boxWidth,
          -boxHeight,
          boxWidth,
          -boxHeight,
          boxWidth,
          boxHeight,
          -boxWidth,
          boxHeight
        ]),
        {}
      )

      world.createBody(body)
    }
  }
}
