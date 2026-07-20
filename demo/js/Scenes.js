import Shapes from "./Shapes.js"

export default class Scenes {
  constructor() {}

  static pyramid(s2, world, option = {}) {
    const {
      rows = 15,
      spacing = 0,
      boxWidth = 40,
      boxHeight = 40,
      groundWidth = innerWidth * 0.5,
      groundHeight = 25,
      centerX = innerWidth * 0.5,
      bottomY = innerHeight - 25
    } = option

    const groundX = centerX
    const groundY = bottomY + groundHeight
    const ground = new s2.RigidBody(groundX, groundY, 0, {
      isStatic: true
    })

    ground.createPolygon(Shapes.rectangle(groundWidth, groundHeight), {
      fillColor: "gray",
      strokeColor: "dimgray"
    })
    world.createBody(ground)

    const colStep = boxWidth * 2 + spacing
    const rowStep = boxHeight * 2 + spacing

    for (let row = 0; row < rows; ++row) {
      const count = rows - row
      const startX = centerX - (count - 1) * colStep * 0.5
      const y = bottomY - boxHeight - row * rowStep

      for (let col = 0; col < count; ++col) {
        const x = startX + col * colStep
        const body = new s2.RigidBody(x, y, 0, {
          friction: 0.3
        })

        body.createPolygon(Shapes.rectangle(boxWidth, boxHeight), {})
        world.createBody(body)
      }
    }
  }

  static verticalStack(s2, world, option = {}) {
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

    ground.createPolygon(Shapes.rectangle(groundWidth, groundHeight), {
      fillColor: "gray",
      strokeColor: "dimgray"
    })

    world.createBody(ground)

    const colStep = boxWidth * 2 + spacing
    const rowStep = boxHeight * 2 + spacing
    const startX = centerX - (columns - 1) * colStep * 0.5

    for (let col = 0; col < columns; ++col) {
      const x = startX + col * colStep

      for (let row = 0; row < rows; ++row) {
        const y = bottomY - boxHeight - row * rowStep

        const body = new s2.RigidBody(x, y, 0, {
          friction: 0.3
        })

        body.createPolygon(Shapes.rectangle(boxWidth, boxHeight), {})
        world.createBody(body)
      }
    }
  }

  static circleStack(s2, world, option = {}) {
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

    ground.createPolygon(Shapes.rectangle(groundWidth, groundHeight), {
      fillColor: "gray",
      strokeColor: "dimgray"
    })

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

  static capsuleStack(s2, world, option = {}) {
    const {
      columns = 1,
      rows = 20,
      length = 40,
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

    ground.createPolygon(Shapes.rectangle(groundWidth, groundHeight), {
      fillColor: "gray",
      strokeColor: "dimgray"
    })

    world.createBody(ground)

    const colStep = radius * 2 + spacing
    const rowStep = length + radius * 2 + spacing
    const startX = centerX - (columns - 1) * colStep * 0.5

    for (let col = 0; col < columns; ++col) {
      const x = startX + col * colStep

      for (let row = 0; row < rows; ++row) {
        const body = new s2.RigidBody(
          x,
          bottomY - (length * 0.5 + radius) - row * rowStep,
          0,
          {
            restitution: 0,
            friction: 0.3
          }
        )

        body.createCapsule(length, radius, {
          roundness: 15
        })
        world.createBody(body)
      }
    }
  }

  static jenga(s2, world, option = {}) {
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

    ground.createPolygon(Shapes.rectangle(groundWidth, groundHeight), {
      fillColor: "gray",
      strokeColor: "dimgray"
    })
    world.createBody(ground)

    const blockSpacing = width * 2
    let y = bottomY - height

    for (let level = 0; level < levels; ++level) {
      const horizontal = (level & 1) === 0

      if (level > 0) y -= height * 6

      for (let block = -levels >> 1; block <= levels >> 1; ++block) {
        const offset = block * blockSpacing
        const body = new s2.RigidBody(
          centerX - offset,
          y,
          horizontal ? 0 : Math.PI * 0.5,
          { friction: 0.3 }
        )

        body.createPolygon(Shapes.rectangle(width, height))
        world.createBody(body)
      }
    }
  }

  static friction(s2, world, option) {
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

    ramp.createPolygon(Shapes.rectangle(rampWidth, rampHeight), {
      fillColor: "gray",
      strokeColor: "dimgray"
    })
    world.createBody(ramp)

    const groundX = centerX
    const groundY = bottomY + groundHeight
    const ground = new s2.RigidBody(groundX, groundY, 0, {
      isStatic: true
    })

    ground.createPolygon(Shapes.rectangle(groundWidth, groundHeight), {
      fillColor: "gray",
      strokeColor: "dimgray"
    })
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

      body.createPolygon(Shapes.rectangle(size, size), {})
      world.createBody(body)
    }
  }

  static lineShapes(s2, world, option = {}) {
    const {
      count = 200,
      size = 0.24,
      groundWidth = 10,
      groundHeight = 1,
      centerX = 0,
      bottomY = 0
    } = option

    const groundX = centerX
    const groundY = bottomY
    const ground = new s2.RigidBody(groundX, groundY, 0, {
      isStatic: true
    })

    ground.createLine(groundWidth, {
      offset: new s2.Vector(-groundWidth * 0.5, -groundWidth * 0.5),
      rotation: 0,
      fillColor: "gray",
      strokeColor: "dimgray"
    })
    ground.createLine(groundWidth, {
      offset: new s2.Vector(groundWidth * 0.5, -groundWidth * 0.5),
      rotation: 0,
      fillColor: "gray",
      strokeColor: "dimgray"
    })
    ground.createPolygon(Shapes.rectangle(groundWidth * 0.5, groundHeight), {
      fillColor: "gray",
      strokeColor: "dimgray"
    })

    world.createBody(ground)

    const eachCount = Math.floor(count / 2)

    for (let i = 0; i < eachCount; i++) {
      const x = Math.random() * groundWidth - groundWidth * 0.5
      const y = Math.random() * -10 - 10
      const body = new s2.RigidBody(x, y, 0, {
        friction: 0.3
      })

      body.createCircle(size, {})
      world.createBody(body)
    }

    for (let i = 0; i < eachCount; i++) {
      const x = Math.random() * groundWidth - groundWidth * 0.5
      const y = Math.random() * -10 - 10
      const body = new s2.RigidBody(x, y, 0, {
        friction: 0.3
      })

      body.createLine(size * 4, {})
      world.createBody(body)
    }
  }

  static mixShapes(s2, world, option = {}) {
    const {
      count = 200,
      size = 0.24,
      groundWidth = 10,
      groundHeight = 1,
      centerX = 0,
      bottomY = 0
    } = option

    const groundX = centerX
    const groundY = bottomY
    const ground = new s2.RigidBody(groundX, groundY, 0, {
      isStatic: true
    })

    ground.createLine(groundWidth, {
      offset: new s2.Vector(-groundWidth * 0.5, -groundWidth * 0.5),
      rotation: 0,
      fillColor: "gray",
      strokeColor: "dimgray"
    })
    ground.createLine(groundWidth, {
      offset: new s2.Vector(groundWidth * 0.5, -groundWidth * 0.5),
      rotation: 0,
      fillColor: "gray",
      strokeColor: "dimgray"
    })
    ground.createLine(groundWidth, {
      rotation: Math.PI * 0.5,
      fillColor: "gray",
      strokeColor: "dimgray"
    })

    world.createBody(ground)

    const eachCount = Math.floor(count / 3)

    for (let i = 0; i < eachCount; i++) {
      const x = Math.random() * groundWidth - groundWidth * 0.5
      const y = Math.random() * -10 - 10
      const body = new s2.RigidBody(x, y, 0, {
        friction: 0.3
      })

      body.createCircle(size, {})
      world.createBody(body)
    }

    for (let i = 0; i < eachCount; i++) {
      const x = Math.random() * groundWidth - groundWidth * 0.5
      const y = Math.random() * -10 - 10
      const body = new s2.RigidBody(x, y, 0, {
        friction: 0.3
      })

      body.createCapsule(size * 2, size, {})
      world.createBody(body)
    }

    for (let i = 0; i < eachCount; i++) {
      const x = Math.random() * groundWidth - groundWidth * 0.5
      const y = Math.random() * -10 - 10
      const body = new s2.RigidBody(x, y, 0, {
        friction: 0.3
      })

      body.createPolygon(Shapes.rectangle(size, size), {})
      world.createBody(body)
    }
  }
}
