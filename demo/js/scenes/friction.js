export default {
  create(s2, world, option) {
    const {
      spacing = 120,
      rampWidth = innerWidth * 0.25,
      rampHeight = 25,
      groundWidth = innerWidth / 2,
      groundHeight = 25,
      centerX = innerWidth * 0.5,
      bottomY = innerHeight
    } = option

    const rampX = centerX * 3
    const rampY = -5
    const ramp = new s2.RigidBody(rampX, rampY, 0.2, {
      isStatic: true
    })

    ramp.createPolygon(
      new Float32Array([
        -rampWidth,
        -rampHeight,
        rampWidth,
        -rampHeight,
        rampWidth,
        rampHeight,
        -rampWidth,
        rampHeight
      ]),
      {
        fillColor: "gray",
        strokeColor: "dimgray"
      }
    )

    world.createBody(ramp)

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

    for (let i = 10, j = 0; i >= 0; i--) {
      j++
      const size = 0.24
      const body = new s2.RigidBody(
        -centerX * 0.2 + j * spacing,
        -10 + size * j,
        0.25,
        {
          friction: i / 10
        }
      )
      const hue = Math.random() * 360

      body.createPolygon(
        new Float32Array([-size, -size, size, -size, size, size, -size, size]),
        {
          // fillColor: `hsla(${hue}, 50%, 50%, 0.5)`,
          // strokeColor: `hsla(${hue}, 50%, 50%, 1)`
        }
      )

      world.createBody(body)
    }
  }
}
