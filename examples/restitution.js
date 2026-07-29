export default function restitution(s2, world, option = {}) {
  const {
    spacing = 0.24,
    radius = 0.24,
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

  const columns = 11
  const colStep = radius * 2 + spacing
  const rowStep = radius * 2 + spacing
  const startX = centerX - (columns - 1) * colStep * 0.5

  for (let col = 0; col < columns; ++col) {
    const x = startX + col * colStep
    const y = bottomY - radius * 5 - rowStep

    const body = new s2.RigidBody(x, y, 0, {
      friction: 0.3,
      restitution: col / 10
    }).createCircle(radius, {})

    world.createBody(body)
  }
}
