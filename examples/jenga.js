export default (s2, world, options = {}) => {
  const {
    levels = 9,
    width = 0.48,
    height = 0.12,
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

  const blockSpacing = width * 2
  let y = bottomY - height

  for (let level = 0; level < levels; ++level) {
    const horizontal = (level & 1) === 0

    if (level > 0) {
      y -= height * 6
    }

    for (let block = -levels >> 1; block <= levels >> 1; ++block) {
      const x = centerX - block * blockSpacing
      const angle = horizontal ? 0 : Math.PI * 0.5

      const body = new s2.RigidBody(x, y, angle, {
        friction: 0.3
      }).createPolygon(
        new Float32Array([
          -width,
          -height,
          width,
          -height,
          width,
          height,
          -width,
          height
        ]),
        {}
      )

      world.createBody(body)
    }
  }
}
