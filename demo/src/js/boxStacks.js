export default {
  create(s2, world, option = {}) {
    const {
      columns = 1,
      rows = 20,
      spacing = 0,
      boxWidth = 40,
      boxHeight = 40,
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

    const halfWidth = boxWidth * 0.5
    const halfHeight = boxHeight * 0.5
    const colStep = boxWidth + spacing
    const rowStep = boxHeight + spacing
    const startX = centerX - (columns - 1) * colStep * 0.5

    for (let col = 0; col < columns; ++col) {
      const x = startX + col * colStep

      for (let row = 0; row < rows; ++row) {
        const y = bottomY - halfHeight - row * rowStep

        const body = new s2.RigidBody(x, y, 0, {
          friction: 0.3
        })

        body.createPolygon(
          new Float32Array([
            -halfWidth,
            -halfHeight,
            halfWidth,
            -halfHeight,
            halfWidth,
            halfHeight,
            -halfWidth,
            halfHeight
          ])
        )

        world.createBody(body)
      }
    }
  }
}
