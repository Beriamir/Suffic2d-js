export default {
  create(s2, world, option = {}) {
    const {
      columns = 1,
      rows = 20,
      radius = 40,
      spacing = 0,
      groundWidth = innerWidth / 2,
      groundHeight = 25,
      centerX = innerWidth * 0.5,
      bottomY = innerHeight
    } = option

    const groundX = centerX
    const groundY = bottomY + groundHeight
    const ground = new s2.RigidBody(groundX, groundY, 0, {
      isStatic: true
    })

    ground.createPolygon(
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
    const rowStep = radius * 2 + spacing
    const startX = centerX - (columns - 1) * colStep * 0.5

    for (let col = 0; col < columns; ++col) {
      const x = startX + col * colStep

      for (let row = 0; row < rows; ++row) {
        const y = bottomY - radius - row * rowStep

        const body = new s2.RigidBody(x, y, 0, {
          friction: 0.3
        })

        body.createCircle(radius, {})

        world.createBody(body)
      }
    }
  }
}
