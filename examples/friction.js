export default (s2, world, options = {}) => {
  const {
    spacing = 1,
    rampWidth = 8,
    rampHeight = 0.24,
    groundWidth = 1000,
    groundHeight = 0.48,
    centerX = 0,
    bottomY = 0
  } = options

  const ramp = new s2.RigidBody(-rampWidth * 0.3, -5, 0.2, {
    isStatic: true
  }).createPolygon(
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

  for (let i = 10, j = 0; i >= 0; i--, j++) {
    const size = 0.24
    const body = new s2.RigidBody(
      -rampWidth + j * spacing,
      -10 + size * j,
      ramp.rotation,
      {
        friction: i / 10
      }
    ).createPolygon(
      new Float32Array([-size, -size, size, -size, size, size, -size, size]),
      {}
    )

    world.createBody(body)
  }
}
