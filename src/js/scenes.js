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
  highMass(world, option = {}) {
    const {
      smallX = innerWidth / 2,
      smallY = innerHeight,
      smallWidth = 40,
      smallHeight = 40,
      bigX = innerWidth / 2,
      bigY = innerHeight,
      bigWidth = 40,
      bigHeight = 40,
      friction = 0.3
    } = option

    const small = world.createRigidBody(smallX, smallY, 0, {
      restitution: 0.0,
      friction
    })
    const big = world.createRigidBody(bigX, bigY, 0, {
      restitution: 0.0,
      friction
    })

    small.createPolygon(
      new Float32Array([
        -smallWidth,
        -smallHeight,
        smallWidth,
        -smallHeight,
        smallWidth,
        smallHeight,
        -smallWidth,
        smallHeight
      ])
    )

    big.createPolygon(
      new Float32Array([
        -bigWidth,
        -bigHeight,
        bigWidth,
        -bigHeight,
        bigWidth,
        bigHeight,
        -bigWidth,
        bigHeight
      ])
    )
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
    const blockSpacing = width + gap
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
  }
}
