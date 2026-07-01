export default {
  spawnGround(s2, world, option = {}) {
    const {
      x = innerWidth / 2,
      y = innerHeight / 2,
      width = innerWidth / 2,
      height = 50
    } = option

    const ground = new s2.RigidBody(x, y, 0, {
      isStatic: true
    })

    ground.createPolygon(
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
      {
        fillColor: "gray",
        strokeColor: "dimgray"
      }
    )

    world.createBody(ground)
  },
  pyramid(s2, world, option = {}) {
    const {
      rows = 15,
      boxWidth = 40,
      boxHeight = 40,
      spacing = 0,
      centerX = innerWidth * 0.5,
      bottomY = innerHeight,
      friction = 0.3
    } = option

    const halfWidth = boxWidth * 0.5
    const halfHeight = boxHeight * 0.5

    const colStep = boxWidth + spacing
    const rowStep = boxHeight + spacing

    for (let row = 0; row < rows; ++row) {
      const count = rows - row
      const startX = centerX - (count - 1) * colStep * 0.5
      const y = bottomY - halfHeight - row * rowStep

      for (let col = 0; col < count; ++col) {
        const x = startX + col * colStep
        const body = new s2.RigidBody(x, y, 0, {
          friction
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
  },
  boxStack(s2, world, option = {}) {
    const {
      columns = 1,
      rows = 20,
      boxWidth = 40,
      boxHeight = 40,
      spacing = 0,
      centerX = innerWidth * 0.5,
      bottomY = innerHeight,
      friction = 0.3
    } = option

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
          friction
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
  },
  circleStack(s2, world, option = {}) {
    const {
      columns = 1,
      rows = 20,
      radius = 40,
      spacing = 0,
      centerX = innerWidth * 0.5,
      bottomY = innerHeight,
      friction = 0.3
    } = option

    const colStep = radius * 2 + spacing
    const rowStep = radius * 2 + spacing
    const startX = centerX - (columns - 1) * colStep * 0.5

    for (let col = 0; col < columns; ++col) {
      const x = startX + col * colStep

      for (let row = 0; row < rows; ++row) {
        const y = bottomY - radius - row * rowStep

        const body = new s2.RigidBody(x, y, 0, {
          friction
        })

        body.createCircle(radius, {})

        world.createBody(body)
      }
    }
  },
  jenga(s2, world, option = {}) {
    const {
      levels = 18,
      width = 80,
      height = 20,
      centerX = innerWidth * 0.5,
      bottomY = innerHeight,
      friction = 0.3,
      gap = 0.5
    } = option

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
          { friction }
        )

        body.createPolygon(
          new Float32Array([-hw, -hh, hw, -hh, hw, hh, -hw, hh])
        )

        world.createBody(body)
      }
    }
  },
  friction(s2, world, option) {
    const {
      startX = innerWidth / 2 - 300,
      startY = 100,
      spacing = 120,
      rampX = 500,
      rampY = 600,
      rampWidth = innerWidth,
      rampHeight = 10
    } = option
    const values = [0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1]

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

    for (let i = 0; i < values.length; i++) {
      const body = new s2.RigidBody(startX + i * spacing, startY, 0, {
        friction: values[i]
      })

      body.createPolygon(new Float32Array([-20, -20, 20, -20, 20, 20, -20, 20]))

      world.createBody(body)
    }
  }
}
