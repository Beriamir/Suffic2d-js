export default {
  create(s2, world, option = {}) {
    const {
      levels = 18,
      width = 80,
      height = 20,
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

    const hw = width / 2
    const hh = height / 2
    const blockSpacing = width
    let y = bottomY - hh

    for (let level = 0; level < levels; ++level) {
      const horizontal = (level & 1) === 0

      if (level > 0) y -= height * 2.5

      for (let block = -4; block <= 4; ++block) {
        const offset = block * blockSpacing
        const body = new s2.RigidBody(
          centerX + offset,
          y,
          horizontal ? 0 : Math.PI * 0.5,
          { friction: 0.3 }
        )

        body.createPolygon(
          new Float32Array([-hw, -hh, hw, -hh, hw, hh, -hw, hh])
        )

        world.createBody(body)
      }
    }
  }
}
