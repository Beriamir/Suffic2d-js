export default {
  spawnGround(world, option = {}) {
    const {
      x = innerWidth / 2,
      y = innerHeight / 2,
      width = innerWidth / 2,
      height = 50
    } = option

    const ground = world.createRigidBody(x, y, 0, {
      isStatic: true,
      restitution: 1,
      friction: 1
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
  },
  pyramid(world, option = {}) {
    const {
      rows = 15,
      boxWidth = 40,
      boxHeight = 40,
      spacing = 0,
      centerX = innerWidth * 0.5,
      bottomY = innerHeight,
      restitution = 0.0,
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
        const body = world.createRigidBody(x, y, 0, {
          restitution,
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
      }
    }
  },
  boxStack(world, option = {}) {
    const {
      columns = 1,
      rows = 20,
      boxWidth = 40,
      boxHeight = 40,
      spacing = 0,
      centerX = innerWidth * 0.5,
      bottomY = innerHeight,
      restitution = 0.0,
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

        const body = world.createRigidBody(x, y, 0, {
          restitution,
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
      }
    }
  },
  circleStack(world, option = {}) {
    const {
      columns = 1,
      rows = 20,
      radius = 40,
      spacing = 0,
      centerX = innerWidth * 0.5,
      bottomY = innerHeight,
      restitution = 0.0,
      friction = 0.3
    } = option

    const colStep = radius * 2 + spacing
    const rowStep = radius * 2 + spacing
    const startX = centerX - (columns - 1) * colStep * 0.5

    for (let col = 0; col < columns; ++col) {
      const x = startX + col * colStep

      for (let row = 0; row < rows; ++row) {
        const y = bottomY - radius - row * rowStep

        const body = world.createRigidBody(x, y, 0, {
          restitution,
          friction,
          // isStatic: row === 0
        })

        body.createCircle(radius, {
          // fillColor: row === 0 ? "gray" : null,
          // strokeColor: row === 0 ? "dimgray" : null
        })
      }
    }
  },
  jenga(world, option = {}) {
    const {
      levels = 18,
      width = 80,
      height = 20,
      centerX = innerWidth * 0.5,
      bottomY = innerHeight,
      restitution = 0.0,
      friction = 0.3,
      gap = 0.5
    } = option

    const hw = width / 2
    const hh = height / 2
    const blockSpacing = width // + gap
    let y = bottomY - hh

    for (let level = 0; level < levels; ++level) {
      const horizontal = (level & 1) === 0

      if (level > 0) y -= height * 3

      for (let block = -1; block <= 1; ++block) {
        const offset = block * blockSpacing
        const body = world.createRigidBody(
          centerX + offset,
          y,
          horizontal ? 0 : Math.PI * 0.5,
          { restitution, friction }
        )

        body.createPolygon(
          new Float32Array([-hw, -hh, hw, -hh, hw, hh, -hw, hh])
        )
      }
    }
  },
  restitution(world, option = {}) {
    const {
      startX = innerWidth / 2 - 300,
      startY = 100,
      spacing = 120
    } = option

    const values = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]

    for (let i = 0; i < values.length; i++) {
      const body = world.createRigidBody(startX + i * spacing, startY, 0, {
        restitution: values[i],
        friction: 0.3
      })

      body.createPolygon(new Float32Array([-20, -40, 20, -40, 20, 40, -20, 40]))
    }
  },
  friction(world, option) {
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

    const ramp = world.createRigidBody(rampX, rampY, 0.3, {
      isStatic: true,
      restitution: 1,
      friction: 1
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

    for (let i = 0; i < values.length; i++) {
      const body = world.createRigidBody(startX + i * spacing, startY, 0, {
        restitution: 0,
        friction: values[i]
      })

      body.createPolygon(new Float32Array([-20, -20, 20, -20, 20, 20, -20, 20]))
    }
  }
}
