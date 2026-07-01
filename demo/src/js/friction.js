export default {
  create(s2, world, option) {
    const {
      spacing = 120,
      rampWidth = innerWidth * 0.25,
      rampHeight = 25,
      groundWidth = innerWidth / 2,
      groundHeight = 25,
      centerX = innerWidth * 0.5,
      bottomY = innerHeight,
      values = [0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1]
    } = option

    const rampX = centerX * 0.6
    const rampY = bottomY * 0.7
    const ramp = new s2.RigidBody(rampX, rampY, 0.3, {
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

    for (let i = 0; i < values.length; i++) {
      const body = new s2.RigidBody(
        centerX * 0.2 + i * spacing,
        bottomY / 2,
        0,
        {
          friction: values[i]
        }
      )

      body.createPolygon(new Float32Array([-20, -20, 20, -20, 20, 20, -20, 20]))

      world.createBody(body)
    }
  }
}
