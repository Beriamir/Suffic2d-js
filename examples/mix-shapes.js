export default function mixShapes(s2, world, option = {}) {
  const {
    count = 200,
    size = 0.24,
    groundWidth = 10,
    centerX = 0,
    bottomY = 0
  } = option

  const ground = new s2.RigidBody(centerX, bottomY, 0, {
    isStatic: true
  })
    .createLine(groundWidth, {
      rotation: Math.PI * 0.5,
      fillColor: "gray",
      strokeColor: "dimgray"
    })
    .createLine(groundWidth, {
      offset: new s2.Vector(-groundWidth * 0.5, -groundWidth * 0.5),
      rotation: 0,
      fillColor: "gray",
      strokeColor: "dimgray"
    })
    .createLine(groundWidth, {
      offset: new s2.Vector(groundWidth * 0.5, -groundWidth * 0.5),
      rotation: 0,
      fillColor: "gray",
      strokeColor: "dimgray"
    })

  world.createBody(ground)

  const eachCount = Math.floor(count / 3)

  for (let i = 0; i < eachCount; i++) {
    const x = Math.random() * groundWidth - groundWidth * 0.5
    const y = Math.random() * -20 - 10
    const body = new s2.RigidBody(x, y, 0, {
      friction: 0.3
    }).createCircle(size, {})

    world.createBody(body)
  }

  for (let i = 0; i < eachCount; i++) {
    const x = Math.random() * groundWidth - groundWidth * 0.5
    const y = Math.random() * -20 - 10
    const body = new s2.RigidBody(x, y, 0, {
      friction: 0.3
    }).createCapsule(size * 2, size, {})

    world.createBody(body)
  }

  for (let i = 0; i < eachCount; i++) {
    const x = Math.random() * groundWidth - groundWidth * 0.5
    const y = Math.random() * -20 - 10
    const body = new s2.RigidBody(x, y, 0, {
      friction: 0.3
    }).createPolygon(
      new Float32Array([-size, -size, size, -size, size, size, -size, size]),
      {}
    )

    world.createBody(body)
  }
}
